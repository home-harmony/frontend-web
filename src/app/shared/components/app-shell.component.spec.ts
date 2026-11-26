import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AppShellComponent } from './app-shell.component';

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

describe('AppShellComponent', () => {
  let store: WorkspaceStore;
  let httpTesting: HttpTestingController;
  let themeService: ThemeService;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ userId: 'u1', email: 'owner@example.com' }),
            logout: vi.fn(),
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    store = TestBed.inject(WorkspaceStore);
    httpTesting = TestBed.inject(HttpTestingController);
    themeService = TestBed.inject(ThemeService);
    i18n = TestBed.inject(I18nService);

    const loadPromise = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Astafiev Household', home_currency: 'MDL' },
          membership: { role: 'owner', display_name: 'Dmitri A.' },
        },
        {
          family: { id: FAMILY_2, name: 'Shared Summer House', home_currency: 'USD' },
          membership: { role: 'other', display_name: 'Dmitri (Co-host)' },
        },
      ],
    });
    await loadPromise;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('switches active workspace across 2+ families and adapts role-aware navigation', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Astafiev Household');
    expect(el.textContent).toContain(i18n.t('shell.nav.debt'));

    // Open workspace switcher dropdown and select second workspace (Role::Other)
    el.querySelector<HTMLButtonElement>('app-workspace-switcher button')?.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>(`[data-workspace-id="${FAMILY_2}"]`)?.click();
    await fixture.whenStable();

    expect(store.activeFamilyId()).toBe(FAMILY_2);
    expect(el.textContent).toContain('Shared Summer House');
    expect(el.textContent).toContain(i18n.t('shell.switchSuccess'));
    expect(el.textContent).not.toContain(i18n.t('shell.nav.debt'));
  });

  it('supports live theme and EN/RU locale switching from top controls', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const themeSelect = el.querySelector<HTMLSelectElement>('app-top-controls select')!;
    themeSelect.value = 'private-navy';
    themeSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(themeService.theme()).toBe('private-navy');
    expect(document.documentElement.dataset['theme']).toBe('private-navy');

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('app-top-controls button'));
    const langBtn = buttons.find((b) => b.textContent?.trim() === 'EN');
    langBtn?.click();
    await fixture.whenStable();

    expect(i18n.locale()).toBe('ru');
    expect(el.textContent).toContain(i18n.t('shell.nav.overview'));
  });
});
