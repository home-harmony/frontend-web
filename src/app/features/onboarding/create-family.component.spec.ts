import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { problemDetailsInterceptor } from '../../core/http/problem-details.interceptor';
import { I18nService } from '../../core/i18n/i18n.service';
import { CreateFamilyComponent } from './create-family.component';

const API_URL = 'https://api.example.test/dev';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('CreateFamilyComponent', () => {
  let httpTesting: HttpTestingController;
  let router: Router;
  let store: WorkspaceStore;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CreateFamilyComponent],
      providers: [
        provideRouter([{ path: 'workspace', component: CreateFamilyComponent }]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ userId: 'u1', email: 'owner@example.com', name: 'Dmitri A.' }),
            logout: vi.fn(),
          },
        },
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    store = TestBed.inject(WorkspaceStore);
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('blocks empty submission with localized validation messages', async () => {
    const fixture = TestBed.createComponent(CreateFamilyComponent);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const ownerInput = el.querySelector<HTMLInputElement>('#owner-display-name');
    expect(ownerInput?.value).toBe('Dmitri A.');

    if (ownerInput) {
      ownerInput.value = '';
      ownerInput.dispatchEvent(new Event('input'));
    }

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    httpTesting.expectNone(`${API_URL}/families`);
    expect(el.textContent).toContain(i18n.t('createFamily.nameRequired'));
    expect(el.textContent).toContain(i18n.t('createFamily.displayNameRequired'));
  });

  it('submits trimmed POST /families payload, selects currency via combobox, and navigates to /workspace', async () => {
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CreateFamilyComponent);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const nameInput = el.querySelector<HTMLInputElement>('#family-name')!;
    nameInput.value = '  Astafiev Household  ';
    nameInput.dispatchEvent(new Event('input'));

    // Open currency combobox and pick EUR
    el.querySelector<HTMLButtonElement>('#home-currency')?.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('[data-currency-code="EUR"]')?.click();
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Astafiev Household',
      home_currency: 'EUR',
      owner_display_name: 'Dmitri A.',
    });

    req.flush({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Astafiev Household',
      home_currency: 'EUR',
      owner_member_id: '22222222-2222-4222-8222-222222222222',
      created_at: '2026-11-26T00:00:00Z',
    });

    await fixture.whenStable();
    expect(store.activeFamilyId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(navSpy).toHaveBeenCalledWith(['/workspace']);
  });

  it('renders localized 422 error banner without leaking raw backend detail', async () => {
    const fixture = TestBed.createComponent(CreateFamilyComponent);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const nameInput = el.querySelector<HTMLInputElement>('#family-name')!;
    nameInput.value = 'Valid Name';
    nameInput.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const secretDetail = 'raw rust validation error: family_name_too_weird';
    httpTesting.expectOne(`${API_URL}/families`).flush(
      {
        type: 'urn:home-harmony:error:invalid_family_name',
        title: 'Unprocessable Entity',
        status: 422,
        detail: secretDetail,
        code: 'INVALID_FAMILY_NAME',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    await fixture.whenStable();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(i18n.t('errors.INVALID_FAMILY_NAME'));
    expect(alert?.textContent).not.toContain(secretDetail);
  });
});
