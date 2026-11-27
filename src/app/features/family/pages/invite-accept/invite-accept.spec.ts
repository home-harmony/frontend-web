import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/services/auth';
import { APP_CONFIG, type AppConfig } from '../../../../core/config/models/app-config';
import { ActiveFamilyStore } from '../../../../core/context/stores/active-family';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { familyHeaderInterceptor } from '../../../../core/http/interceptors/family-header';
import { problemDetailsInterceptor } from '../../../../core/http/interceptors/problem-details';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { InviteAccept } from './invite-accept';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';
const FAMILY_2 = '22222222-2222-4222-8222-222222222222';
const INVITE_TOKEN_1 = '33333333-3333-4333-8333-333333333333';
const INVITE_TOKEN_2 = '44444444-4444-4444-8444-444444444444';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('InviteAccept', () => {
  let httpTesting: HttpTestingController;
  let store: WorkspaceStore;
  let activeFamilyStore: ActiveFamilyStore;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'join', component: InviteAccept },
          { path: 'workspace', component: InviteAccept },
          { path: 'onboarding', component: InviteAccept },
        ]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        {
          provide: AuthService,
          useValue: {
            user: signal({
              sub: 'user-sub-1',
              email: 'alex@example.test',
              emailVerified: true,
              name: 'Alex',
            }),
            getValidIdToken: vi.fn().mockResolvedValue('tok'),
          },
        },
        provideHttpClient(withInterceptors([familyHeaderInterceptor, problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WorkspaceStore);
    activeFamilyStore = TestBed.inject(ActiveFamilyStore);
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  async function seedExistingWorkspace(): Promise<void> {
    const p = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Existing Family', home_currency: 'USD' },
          membership: { role: 'owner', display_name: 'Alex' },
        },
      ],
    });
    await p;
    expect(activeFamilyStore.activeFamilyId()).toBe(FAMILY_1);
  }

  it('submits identity-only POST /families/{id}/members without X-Family-Id, refreshes workspaces, and selects joined family', async () => {
    await seedExistingWorkspace();
    const harness = await RouterTestingHarness.create(
      `/join?familyId=${FAMILY_2}&token=${INVITE_TOKEN_1}`,
    );
    await harness.fixture.whenStable();

    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain(FAMILY_2);

    const nameInput = el.querySelector<HTMLInputElement>('#join-display-name')!;
    nameInput.value = 'Alex Invited';
    nameInput.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const postReq = httpTesting.expectOne(`${API_URL}/families/${FAMILY_2}/members`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.headers.has('X-Family-Id')).toBe(false);
    expect(postReq.request.body).toEqual({
      token: INVITE_TOKEN_1,
      display_name: 'Alex Invited',
    });

    postReq.flush(
      {
        id: 'member-2',
        family_id: FAMILY_2,
        user_id: 'user-sub-1',
        display_name: 'Alex Invited',
        role: 'member',
        permissions: ['view_budget'],
        relationship: 'Partner',
        joined_at: '2026-11-26T12:00:00Z',
      },
      { status: 201, statusText: 'Created' },
    );
    await Promise.resolve();

    const refreshReq = httpTesting.expectOne(`${API_URL}/profile/families`);
    refreshReq.flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Existing Family', home_currency: 'USD' },
          membership: { role: 'owner', display_name: 'Alex' },
        },
        {
          family: { id: FAMILY_2, name: 'Joined Household', home_currency: 'EUR' },
          membership: { role: 'member', display_name: 'Alex Invited' },
        },
      ],
    });
    await Promise.resolve();
    await harness.fixture.whenStable();

    expect(store.activeFamilyId()).toBe(FAMILY_2);
    expect(el.textContent).toContain(i18n.t('join.successTitle'));
    expect(el.textContent).toContain('Alex Invited');
    expect(el.querySelector('a[href="/workspace"]')).not.toBeNull();
  });

  it('allows pasting an invite URL or familyId:token when query parameters are missing', async () => {
    const harness = await RouterTestingHarness.create('/join');
    await harness.fixture.whenStable();

    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain(i18n.t('join.missingParamsTitle'));

    const pasteInput = el.querySelector<HTMLInputElement>('#join-paste-input')!;
    pasteInput.value = `https://app.example.test/join?familyId=${FAMILY_2}&token=${INVITE_TOKEN_2}`;
    pasteInput.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    expect(el.textContent).toContain(FAMILY_2);
    expect(el.querySelector<HTMLInputElement>('#join-display-name')).not.toBeNull();
  });

  it.each([
    [404, 'INVITE_TOKEN_NOT_FOUND'],
    [409, 'TOKEN_ALREADY_USED'],
    [409, 'MEMBER_ALREADY_EXISTS'],
    [410, 'TOKEN_EXPIRED'],
    [410, 'FAMILY_DELETED'],
    [422, 'INVALID_DISPLAY_NAME'],
  ] as const)(
    'maps HTTP %s (%s) to localized RFC 9457 error alert without leaking raw backend detail',
    async (status, code) => {
      await seedExistingWorkspace();
      const harness = await RouterTestingHarness.create(
        `/join?familyId=${FAMILY_2}&token=${INVITE_TOKEN_1}`,
      );
      await harness.fixture.whenStable();

      const el = harness.routeNativeElement!;
      el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await Promise.resolve();

      const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_2}/members`);
      req.flush(
        {
          type: 'about:blank',
          title: code,
          status,
          code,
          detail: `RAW_INTERNAL_${code}_SQL_TRACE`,
        },
        { status, statusText: 'Error' },
      );
      await Promise.resolve();
      await harness.fixture.whenStable();

      const alert = el.querySelector('[role="alert"]');
      const expectedKey = `errors.${code}` as const;
      expect(alert?.textContent?.trim()).toBe(i18n.t(expectedKey));
      expect(el.textContent).not.toContain(`RAW_INTERNAL_${code}_SQL_TRACE`);
      expect(el.querySelector('a[href="/workspace"]')).not.toBeNull();
      expect(el.querySelector('a[href="/onboarding"]')).not.toBeNull();
    },
  );
});
