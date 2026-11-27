import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth';
import { APP_CONFIG, type AppConfig } from '../../../../core/config/models/app-config';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { problemDetailsInterceptor } from '../../../../core/http/interceptors/problem-details';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { WorkspaceOverview } from './workspace-overview';

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

describe('WorkspaceOverview', () => {
  let httpTesting: HttpTestingController;
  let store: WorkspaceStore;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WorkspaceOverview],
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

    const p = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Astafiev Household', home_currency: 'MDL' },
          membership: { role: 'owner', display_name: 'Dmitri A.' },
        },
        {
          family: { id: FAMILY_2, name: 'Allowance Ledger', home_currency: 'USD' },
          membership: { role: 'child', display_name: 'Junior' },
        },
      ],
    });
    await p;
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads GET /families/{id}, renders created date, and updates role-gated roadmap on workspace switch', async () => {
    const fixture = TestBed.createComponent(WorkspaceOverview);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}`).flush({
      id: FAMILY_1,
      name: 'Astafiev Household',
      home_currency: 'MDL',
      created_at: '2026-11-20T09:15:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2026-11-20');
    expect(el.textContent).not.toContain(i18n.t('overview.hiddenChild'));

    store.selectFamily(FAMILY_2);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_2}`).flush({
      id: FAMILY_2,
      name: 'Allowance Ledger',
      home_currency: 'USD',
      created_at: '2026-11-22T12:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();

    expect(el.textContent).toContain('Allowance Ledger');
    expect(el.textContent).toContain('2026-11-22');
    expect(el.textContent).toContain(i18n.t('overview.hiddenChild'));
  });

  it('evicts deleted workspace on 410 FAMILY_DELETED and displays recovery panel', async () => {
    const fixture = TestBed.createComponent(WorkspaceOverview);
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
    expect(el.textContent).toContain(i18n.t('familyDeleted.title'));
    expect(el.textContent).toContain(i18n.t('familyDeleted.switchRemaining'));
  });
});
