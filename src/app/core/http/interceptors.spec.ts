import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { ActiveFamilyStore } from '../context/active-family.store';
import { I18nService } from '../i18n/i18n.service';
import { ApiHttpError } from './api-http-error';
import { authInterceptor } from './auth.interceptor';
import { familyHeaderInterceptor } from './family-header.interceptor';
import { problemDetailsInterceptor } from './problem-details.interceptor';

const API_URL = 'https://api.example.test/dev';
const FAMILY_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('HTTP interceptors pipeline', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let activeFamilyStore: ActiveFamilyStore;
  let i18n: I18nService;
  let mockAuth: {
    getValidIdToken: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
    session: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    mockAuth = {
      getValidIdToken: vi.fn().mockResolvedValue('id-token-initial'),
      refreshSession: vi.fn().mockResolvedValue(true),
      clearSession: vi.fn(),
      startLogin: vi.fn().mockResolvedValue(undefined),
      session: vi.fn().mockReturnValue({
        idToken: 'id-token-refreshed',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresAt: Date.now() + 60_000,
        user: { userId: 'u1', email: 'u1@example.com' },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthService, useValue: mockAuth },
        provideHttpClient(
          withInterceptors([problemDetailsInterceptor, authInterceptor, familyHeaderInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    activeFamilyStore = TestBed.inject(ActiveFamilyStore);
    i18n = TestBed.inject(I18nService);
    activeFamilyStore.setActiveFamilyId(FAMILY_ID);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('attaches Authorization Bearer IdToken and omits headers for external URLs', async () => {
    const apiPromise = firstValueFrom(http.get(`${API_URL}/profile/families`));
    await Promise.resolve();
    const apiReq = httpTesting.expectOne(`${API_URL}/profile/families`);
    expect(apiReq.request.headers.get('Authorization')).toBe('Bearer id-token-initial');
    apiReq.flush({ items: [] });
    await apiPromise;

    const extPromise = firstValueFrom(http.get('https://other.example.test/public'));
    const extReq = httpTesting.expectOne('https://other.example.test/public');
    expect(extReq.request.headers.has('Authorization')).toBe(false);
    expect(extReq.request.headers.has('X-Family-Id')).toBe(false);
    extReq.flush({});
    await extPromise;
  });

  it('enforces X-Family-Id across all 9 family_service routes (6 scoped vs 3 identity-only)', async () => {
    const identityOnly: [string, string][] = [
      ['GET', `${API_URL}/profile/families`],
      ['POST', `${API_URL}/families`],
      ['POST', `${API_URL}/families/${FAMILY_ID}/members`],
    ];

    for (const [method, url] of identityOnly) {
      const p = firstValueFrom(http.request(method, url, { body: {} }));
      await Promise.resolve();
      const req = httpTesting.expectOne(url);
      expect(req.request.headers.has('X-Family-Id')).toBe(false);
      req.flush({});
      await p;
    }

    const familyScoped: [string, string][] = [
      ['GET', `${API_URL}/families/${FAMILY_ID}`],
      ['PUT', `${API_URL}/families/${FAMILY_ID}`],
      ['POST', `${API_URL}/families/${FAMILY_ID}/invites`],
      ['GET', `${API_URL}/families/${FAMILY_ID}/members`],
      ['PATCH', `${API_URL}/families/${FAMILY_ID}/members/${MEMBER_ID}/role`],
      ['DELETE', `${API_URL}/families/${FAMILY_ID}/members/${MEMBER_ID}`],
    ];

    for (const [method, url] of familyScoped) {
      const p = firstValueFrom(http.request(method, url, { body: {} }));
      await Promise.resolve();
      const req = httpTesting.expectOne(url);
      expect(req.request.headers.get('X-Family-Id')).toBe(FAMILY_ID);
      req.flush({});
      await p;
    }
  });

  it('refreshes once and retries on 401 before succeeding', async () => {
    const responsePromise = firstValueFrom(http.get(`${API_URL}/families/${FAMILY_ID}`));
    await Promise.resolve();

    const firstAttempt = httpTesting.expectOne(`${API_URL}/families/${FAMILY_ID}`);
    expect(firstAttempt.request.headers.get('Authorization')).toBe('Bearer id-token-initial');
    firstAttempt.flush(
      {
        type: 'urn:home-harmony:error:missing_claims',
        title: 'Unauthorized',
        status: 401,
        detail: 'expired',
        code: 'MISSING_CLAIMS',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    await Promise.resolve();
    const retryAttempt = httpTesting.expectOne(`${API_URL}/families/${FAMILY_ID}`);
    expect(retryAttempt.request.headers.get('Authorization')).toBe('Bearer id-token-refreshed');
    retryAttempt.flush({ id: FAMILY_ID, name: 'Test', home_currency: 'MDL', created_at: '2026-11-26T00:00:00Z' });

    const data = await responsePromise;
    expect(data).toMatchObject({ id: FAMILY_ID });
    expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1);
    expect(mockAuth.startLogin).not.toHaveBeenCalled();
  });

  it('clears session and triggers login when 401 refresh fails', async () => {
    mockAuth.refreshSession.mockResolvedValue(false);

    const responsePromise = firstValueFrom(http.get(`${API_URL}/families/${FAMILY_ID}`)).catch(
      (err: unknown) => err,
    );
    await Promise.resolve();

    const firstAttempt = httpTesting.expectOne(`${API_URL}/families/${FAMILY_ID}`);
    firstAttempt.flush(
      {
        type: 'urn:home-harmony:error:invalid_claims',
        title: 'Unauthorized',
        status: 401,
        detail: 'bad token',
        code: 'INVALID_CLAIMS',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    const err = await responsePromise;
    expect(mockAuth.clearSession).toHaveBeenCalledTimes(1);
    expect(mockAuth.startLogin).toHaveBeenCalledTimes(1);
    expect(err).toBeInstanceOf(ApiHttpError);
    expect((err as ApiHttpError).code).toBe('INVALID_CLAIMS');
  });

  it('maps RFC 9457 ProblemDetails to localized ApiHttpError without leaking raw detail', async () => {
    i18n.setLocale('ru');
    const secretDetail = 'internal sql constraint xyz_123';

    const errPromise = firstValueFrom(http.get(`${API_URL}/families/${FAMILY_ID}`)).catch(
      (err: unknown) => err,
    );
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_ID}`);
    req.flush(
      {
        type: 'urn:home-harmony:error:user_not_in_family',
        title: 'Forbidden',
        status: 403,
        detail: secretDetail,
        code: 'USER_NOT_IN_FAMILY',
      },
      { status: 403, statusText: 'Forbidden' },
    );

    const err = await errPromise;
    expect(err).toBeInstanceOf(ApiHttpError);
    const apiErr = err as ApiHttpError;
    expect(apiErr.status).toBe(403);
    expect(apiErr.code).toBe('USER_NOT_IN_FAMILY');
    expect(apiErr.localizedMessage).toBe(i18n.t('errors.USER_NOT_IN_FAMILY'));
    expect(apiErr.localizedMessage).not.toContain(secretDetail);
  });
});
