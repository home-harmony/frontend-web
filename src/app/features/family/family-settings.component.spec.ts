import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Role } from '../../core/api/family.dto';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { problemDetailsInterceptor } from '../../core/http/problem-details.interceptor';
import { I18nService } from '../../core/i18n/i18n.service';
import { FamilySettingsComponent } from './family-settings.component';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';
const FAMILY_2 = '22222222-2222-4222-8222-222222222222';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('FamilySettingsComponent', () => {
  let httpTesting: HttpTestingController;
  let store: WorkspaceStore;
  let i18n: I18nService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FamilySettingsComponent],
      providers: [
        provideRouter([{ path: 'onboarding', component: FamilySettingsComponent }]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthService, useValue: { getValidIdToken: vi.fn().mockResolvedValue('tok') } },
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WorkspaceStore);
    i18n = TestBed.inject(I18nService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  async function seedFamilies(role: Role, includeSecond = false): Promise<void> {
    const items = [
      {
        family: { id: FAMILY_1, name: 'Astafiev Household', home_currency: 'MDL' },
        membership: { role, display_name: 'Dmitri A.' },
      },
      ...(includeSecond
        ? [
            {
              family: { id: FAMILY_2, name: 'Parents Support', home_currency: 'EUR' },
              membership: { role: 'member' as const, display_name: 'Dmitri' },
            },
          ]
        : []),
    ];

    const p = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({ items });
    await p;
  }

  it('renders editable form for Owner, submits PUT /families/{id}, and syncs WorkspaceStore', async () => {
    await seedFamilies('owner');
    const fixture = TestBed.createComponent(FamilySettingsComponent);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush({
      id: FAMILY_1,
      name: 'Astafiev Household',
      home_currency: 'MDL',
      created_at: '2026-11-20T00:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const nameInput = el.querySelector<HTMLInputElement>('#settings-family-name')!;
    expect(nameInput.value).toBe('Astafiev Household');

    nameInput.value = '  Updated Family  ';
    nameInput.dispatchEvent(new Event('input'));
    el.querySelector<HTMLButtonElement>('#settings-home-currency')?.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('[data-currency-code="EUR"]')?.click();
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const putReq = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      name: 'Updated Family',
      home_currency: 'EUR',
    });
    putReq.flush({
      id: FAMILY_1,
      name: 'Updated Family',
      home_currency: 'EUR',
      created_at: '2026-11-20T00:00:00Z',
    });

    await Promise.resolve();
    await fixture.whenStable();
    expect(store.activeWorkspace()?.family.name).toBe('Updated Family');
    expect(store.activeWorkspace()?.family.home_currency).toBe('EUR');
    expect(el.textContent).toContain(i18n.t('settings.saved'));
  });

  it('renders read-only view without edit controls for Member, Child, and Other', async () => {
    for (const role of ['member', 'child', 'other'] as const) {
      TestBed.resetTestingModule();
      localStorage.clear();
      await TestBed.configureTestingModule({
        imports: [FamilySettingsComponent],
        providers: [
          provideRouter([]),
          { provide: APP_CONFIG, useValue: TEST_CONFIG },
          { provide: AuthService, useValue: { getValidIdToken: vi.fn().mockResolvedValue('tok') } },
          provideHttpClient(withInterceptors([problemDetailsInterceptor])),
          provideHttpClientTesting(),
        ],
      }).compileComponents();

      httpTesting = TestBed.inject(HttpTestingController);
      store = TestBed.inject(WorkspaceStore);
      i18n = TestBed.inject(I18nService);

      await seedFamilies(role);
      const fixture = TestBed.createComponent(FamilySettingsComponent);
      await fixture.whenStable();

      httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush({
        id: FAMILY_1,
        name: 'Astafiev Household',
        home_currency: 'MDL',
        created_at: '2026-11-20T00:00:00Z',
      });
      await Promise.resolve();
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('form')).toBeNull();
      expect(el.querySelector('#settings-family-name')).toBeNull();
      expect(el.textContent).toContain(i18n.t('settings.readonlyNotice'));
      expect(el.textContent).toContain('Astafiev Household');
      httpTesting.verify();
    }
  });

  it('displays localized 422 and 403 banners without leaking raw backend detail', async () => {
    await seedFamilies('owner');
    const fixture = TestBed.createComponent(FamilySettingsComponent);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush({
      id: FAMILY_1,
      name: 'Astafiev Household',
      home_currency: 'MDL',
      created_at: '2026-11-20T00:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const nameInput = el.querySelector<HTMLInputElement>('#settings-family-name')!;
    nameInput.value = 'Edited Name';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const secretDetail = 'internal rust sql diagnostic secret_abc';
    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush(
      {
        type: 'urn:home-harmony:error:invalid_currency_code',
        title: 'Unprocessable Entity',
        status: 422,
        detail: secretDetail,
        code: 'INVALID_CURRENCY_CODE',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await Promise.resolve();
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      i18n.t('errors.INVALID_CURRENCY_CODE'),
    );
    expect(el.textContent).not.toContain(secretDetail);

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush(
      {
        type: 'urn:home-harmony:error:insufficient_role',
        title: 'Forbidden',
        status: 403,
        detail: secretDetail,
        code: 'INSUFFICIENT_ROLE',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await Promise.resolve();
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      i18n.t('errors.INSUFFICIENT_ROLE'),
    );
    expect(el.textContent).not.toContain(secretDetail);
  });

  it('evicts deleted family on 410 FAMILY_DELETED and recovers to remaining workspace or onboarding', async () => {
    await seedFamilies('owner', true);
    const fixture = TestBed.createComponent(FamilySettingsComponent);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush(
      {
        type: 'urn:home-harmony:error:family_deleted',
        title: 'Gone',
        status: 410,
        detail: 'deleted',
        code: 'FAMILY_DELETED',
      },
      { status: 410, statusText: 'Gone' },
    );
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(store.families().map((f) => f.family.id)).toEqual([FAMILY_2]);
    expect(store.activeFamilyId()).toBe(FAMILY_2);
    expect(el.textContent).toContain(i18n.t('familyDeleted.title'));

    const switchBtn = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(i18n.t('familyDeleted.switchRemaining')),
    );
    switchBtn?.click();
    await Promise.resolve();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_2}`).flush({
      id: FAMILY_2,
      name: 'Parents Support',
      home_currency: 'EUR',
      created_at: '2026-10-12T00:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();
    expect(el.textContent).toContain('Parents Support');

    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    httpTesting.expectNone(`${API_URL}/families/${FAMILY_2}`);
    expect(navSpy).not.toHaveBeenCalled();
  });
});
