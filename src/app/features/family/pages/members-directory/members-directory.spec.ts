import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Role } from '../../../../core/context/models/rbac';
import type { MemberResponse } from '../../models/family-dto';
import { AuthService } from '../../../../core/auth/services/auth';
import { APP_CONFIG, type AppConfig } from '../../../../core/config/models/app-config';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { problemDetailsInterceptor } from '../../../../core/http/interceptors/problem-details';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { MembersDirectory } from './members-directory';

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

const SAMPLE_MEMBERS: readonly MemberResponse[] = [
  {
    id: 'm-owner',
    family_id: FAMILY_1,
    user_id: 'u-1',
    display_name: 'Dmitri A.',
    role: 'owner',
    permissions: [],
    relationship: 'Head of Household',
    joined_at: '2026-11-20T00:00:00Z',
  },
  {
    id: 'm-member',
    family_id: FAMILY_1,
    user_id: 'u-2',
    display_name: 'Elena A.',
    role: 'member',
    permissions: [],
    relationship: 'Spouse',
    joined_at: '2026-11-21T00:00:00Z',
  },
  {
    id: 'm-other',
    family_id: FAMILY_1,
    user_id: 'u-3',
    display_name: 'Olga V.',
    role: 'other',
    permissions: ['view_budget', 'view_reports'],
    relationship: 'Grandmother',
    joined_at: '2026-11-24T00:00:00Z',
  },
];

describe('MembersDirectory', () => {
  let httpTesting: HttpTestingController;
  let store: WorkspaceStore;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MembersDirectory],
      providers: [
        provideRouter([{ path: 'onboarding', component: MembersDirectory }]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthService, useValue: { getValidIdToken: vi.fn().mockResolvedValue('tok') } },
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(WorkspaceStore);
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  async function seedFamilies(role: Role, includeSecond = false): Promise<void> {
    const items = [
      {
        family: { id: FAMILY_1, name: 'Astafiev Household', home_currency: 'MDL' },
        membership: { role, display_name: 'Current User' },
      },
      ...(includeSecond
        ? [
            {
              family: { id: FAMILY_2, name: 'Parents Support', home_currency: 'EUR' },
              membership: { role: 'member' as const, display_name: 'Current User' },
            },
          ]
        : []),
    ];

    const p = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({ items });
    await p;
  }

  it('renders Owner governance controls (protected Owner row) and refreshes after removing a member', async () => {
    await seedFamilies('owner');
    const fixture = TestBed.createComponent(MembersDirectory);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members`).flush({ items: SAMPLE_MEMBERS });
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(i18n.t('overview.inviteMember'));
    expect(el.querySelector('[data-testid="members-readonly-notice"]')).toBeNull();

    const ownerRow = el.querySelector('tr[data-member-id="m-owner"]')!;
    expect(ownerRow.textContent).toContain(i18n.t('members.protectedOwner'));
    expect(ownerRow.querySelector('[data-edit-member-id]')).toBeNull();
    expect(ownerRow.querySelector('[data-remove-member-id]')).toBeNull();

    const removeBtn = el.querySelector<HTMLButtonElement>('[data-remove-member-id="m-other"]')!;
    removeBtn.click();
    await fixture.whenStable();

    const dialog = el.querySelector('app-remove-member-dialog')!;
    const confirmBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === i18n.t('removeMemberDialog.confirm'),
    )!;
    confirmBtn.click();
    await Promise.resolve();

    const delReq = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/m-other`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();

    // Directory refreshes roster after 204 No Content.
    httpTesting
      .expectOne(`${API_URL}/families/${FAMILY_1}/members`)
      .flush({ items: SAMPLE_MEMBERS.slice(0, 2) });
    await Promise.resolve();
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Olga V.');
  });

  it.each(['member', 'child', 'other'] as const)(
    'renders read-only directory without Owner controls for %s role',
    async (role) => {
      await seedFamilies(role);
      const fixture = TestBed.createComponent(MembersDirectory);
      await fixture.whenStable();

      httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members`).flush({ items: SAMPLE_MEMBERS });
      await Promise.resolve();
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="members-readonly-notice"]')?.textContent?.trim()).toBe(
        i18n.t('members.readOnlyNotice'),
      );
      expect(el.querySelector('[data-edit-member-id]')).toBeNull();
      expect(el.querySelector('[data-remove-member-id]')).toBeNull();
      expect(el.textContent).not.toContain(i18n.t('overview.inviteMember'));
    },
  );

  it('reloads GET /families/{id}/members on workspace switch without stale rows', async () => {
    await seedFamilies('owner', true);
    const fixture = TestBed.createComponent(MembersDirectory);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members`).flush({ items: SAMPLE_MEMBERS });
    await Promise.resolve();
    await fixture.whenStable();

    store.selectFamily(FAMILY_2);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_2}/members`).flush({
      items: [
        {
          id: 'm-f2',
          family_id: FAMILY_2,
          user_id: 'u-9',
          display_name: 'Nadia B.',
          role: 'owner',
          permissions: [],
          relationship: null,
          joined_at: '2026-11-25T00:00:00Z',
        },
      ],
    });
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nadia B.');
    expect(el.textContent).not.toContain('Elena A.');
  });

  it('evicts deleted family workspace and shows recovery card on 410 FAMILY_DELETED', async () => {
    await seedFamilies('owner', true);
    const fixture = TestBed.createComponent(MembersDirectory);
    await fixture.whenStable();

    httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members`).flush(
      {
        type: 'about:blank',
        title: 'Gone',
        status: 410,
        code: 'FAMILY_DELETED',
        detail: 'deleted cluster row',
      },
      { status: 410, statusText: 'Gone' },
    );
    await Promise.resolve();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-family-deleted-card')).not.toBeNull();
    expect(store.families().map((f) => f.family.id)).toEqual([FAMILY_2]);
    expect(el.textContent).not.toContain('deleted cluster row');
  });
});
