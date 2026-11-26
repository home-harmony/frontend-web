import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { ActiveFamilyStore } from '../context/active-family.store';
import { AuthNavigator } from './auth-navigator';
import { AuthService } from './auth.service';
import { base64UrlEncode } from './pkce';

function makeIdToken(overrides: Record<string, unknown> = {}): string {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256' })));
  const payload = {
    sub: '22222222-2222-4222-8222-222222222222',
    token_use: 'id',
    aud: 'client-abc',
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'owner@example.com',
    email_verified: true,
    ...overrides,
  };
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${header}.${body}.sig`;
}

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: 'https://api.example.test/dev',
  cognitoDomain: 'https://auth.example.test/',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let redirectedUrls: string[];
  let activeFamilyStore: ActiveFamilyStore;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    redirectedUrls = [];

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        {
          provide: AuthNavigator,
          useValue: {
            redirectTo: (url: string) => {
              redirectedUrls.push(url);
            },
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    activeFamilyStore = TestBed.inject(ActiveFamilyStore);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('starts PKCE login, stores ephemeral verifier/state/returnUrl, and builds authorize URL', async () => {
    await service.startLogin('/join?familyId=111&token=222');

    expect(sessionStorage.getItem('fl_pkce_verifier')).toBeTruthy();
    expect(sessionStorage.getItem('fl_oauth_state')).toBeTruthy();
    expect(sessionStorage.getItem('fl_return_url')).toBe('/join?familyId=111&token=222');

    expect(redirectedUrls.length).toBe(1);
    const url = new URL(redirectedUrls[0]);
    expect(`${url.origin}${url.pathname}`).toBe('https://auth.example.test/oauth2/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-abc');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:4200/auth/callback');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe(sessionStorage.getItem('fl_oauth_state'));
  });

  it('exchanges code for tokens on valid callback and restores returnUrl', async () => {
    await service.startLogin('/join?familyId=111&token=222');
    const state = sessionStorage.getItem('fl_oauth_state');
    const idToken = makeIdToken();

    const callbackPromise = service.handleCallback({ code: 'auth-code-1', state });
    await Promise.resolve();

    const req = httpTesting.expectOne('https://auth.example.test/oauth2/token');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(req.request.body).toContain('grant_type=authorization_code');
    expect(req.request.body).toContain('code=auth-code-1');

    req.flush({
      id_token: idToken,
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const outcome = await callbackPromise;
    expect(outcome).toEqual({ ok: true, returnUrl: '/join?familyId=111&token=222' });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('owner@example.com');
    expect(sessionStorage.getItem('fl_pkce_verifier')).toBeNull();
    expect(sessionStorage.getItem('fl_oauth_state')).toBeNull();
    expect(sessionStorage.getItem('fl_return_url')).toBeNull();
  });

  it('rejects callback on state mismatch, missing code, unverified email, and exchange failure', async () => {
    await service.startLogin('/');
    expect(
      await service.handleCallback({ code: 'c1', state: 'wrong-state' }),
    ).toEqual({ ok: false, reason: 'STATE_MISMATCH' });

    await service.startLogin('/');
    const state2 = sessionStorage.getItem('fl_oauth_state');
    expect(await service.handleCallback({ code: null, state: state2 })).toEqual({
      ok: false,
      reason: 'MISSING_CODE',
    });

    await service.startLogin('/');
    const state3 = sessionStorage.getItem('fl_oauth_state');
    const unverifiedPromise = service.handleCallback({ code: 'c3', state: state3 });
    await Promise.resolve();
    httpTesting.expectOne('https://auth.example.test/oauth2/token').flush({
      id_token: makeIdToken({ email_verified: false }),
      access_token: 'access-1',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    expect(await unverifiedPromise).toEqual({ ok: false, reason: 'UNVERIFIED_EMAIL' });
    expect(service.isAuthenticated()).toBe(false);

    await service.startLogin('/');
    const state4 = sessionStorage.getItem('fl_oauth_state');
    const errorPromise = service.handleCallback({ code: 'c4', state: state4 });
    await Promise.resolve();
    httpTesting
      .expectOne('https://auth.example.test/oauth2/token')
      .flush('bad request', { status: 400, statusText: 'Bad Request' });
    expect(await errorPromise).toEqual({ ok: false, reason: 'TOKEN_EXCHANGE_FAILED' });
  });

  it('deduplicates concurrent refreshSession calls and preserves refreshToken', async () => {
    const expiredId = makeIdToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    const freshId = makeIdToken({ exp: Math.floor(Date.now() / 1000) + 3600 });

    sessionStorage.setItem(
      'fl_auth_session',
      JSON.stringify({
        idToken: expiredId,
        accessToken: 'old-access',
        refreshToken: 'keep-refresh-token',
        expiresAt: Date.now() - 10_000,
        user: { userId: '22222222-2222-4222-8222-222222222222', email: 'owner@example.com' },
      }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthNavigator, useValue: { redirectTo: () => undefined } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const freshService = TestBed.inject(AuthService);
    const freshHttpTesting = TestBed.inject(HttpTestingController);

    const [p1, p2] = [freshService.refreshSession(), freshService.refreshSession()];
    await Promise.resolve();

    const req = freshHttpTesting.expectOne('https://auth.example.test/oauth2/token');
    expect(req.request.body).toContain('grant_type=refresh_token');
    expect(req.request.body).toContain('refresh_token=keep-refresh-token');
    req.flush({
      id_token: freshId,
      access_token: 'new-access',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    expect(await Promise.all([p1, p2])).toEqual([true, true]);
    expect(freshService.session()?.idToken).toBe(freshId);
    expect(freshService.session()?.refreshToken).toBe('keep-refresh-token');
    freshHttpTesting.verify();
  });

  it('clears session, active family, and redirects to Cognito logout on logout()', () => {
    activeFamilyStore.setActiveFamilyId('33333333-3333-4333-8333-333333333333');
    service.logout(true);

    expect(service.session()).toBeNull();
    expect(activeFamilyStore.activeFamilyId()).toBeNull();
    expect(redirectedUrls.length).toBe(1);
    const logoutUrl = new URL(redirectedUrls[0]);
    expect(`${logoutUrl.origin}${logoutUrl.pathname}`).toBe('https://auth.example.test/logout');
    expect(logoutUrl.searchParams.get('client_id')).toBe('client-abc');
    expect(logoutUrl.searchParams.get('logout_uri')).toBe('http://localhost:4200/auth/logout');
  });
});
