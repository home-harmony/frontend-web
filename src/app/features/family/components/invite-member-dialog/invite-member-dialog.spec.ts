import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/services/auth';
import { APP_CONFIG, type AppConfig } from '../../../../core/config/models/app-config';
import { problemDetailsInterceptor } from '../../../../core/http/interceptors/problem-details';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { InviteMemberDialog } from './invite-member-dialog';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('InviteMemberDialog', () => {
  let httpTesting: HttpTestingController;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [InviteMemberDialog],
      providers: [
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthService, useValue: { getValidIdToken: vi.fn().mockResolvedValue('tok') } },
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('excludes Owner role and hides custom permissions checklist unless role is Other', async () => {
    const fixture = TestBed.createComponent(InviteMemberDialog);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    fixture.componentRef.setInput('familyName', 'Astafiev Household');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    expect(roleRadios).toHaveLength(3);
    expect(roleRadios.map((btn) => btn.textContent?.trim())).toEqual(['Member', 'Child', 'Other']);

    // Default role is member: checklist must be absent.
    expect(el.querySelector('app-permission-checklist')).toBeNull();

    // Switch to child: checklist still absent.
    roleRadios[1].click();
    await fixture.whenStable();
    expect(el.querySelector('app-permission-checklist')).toBeNull();

    // Switch to other: checklist appears with all 8 permissions.
    roleRadios[2].click();
    await fixture.whenStable();
    expect(el.querySelector('app-permission-checklist')).not.toBeNull();
    expect(el.querySelectorAll('app-permission-checklist input[type="checkbox"]')).toHaveLength(8);
  });

  it('submits custom permissions only for Other role and renders copyable /join link', async () => {
    const fixture = TestBed.createComponent(InviteMemberDialog);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    fixture.componentRef.setInput('familyName', 'Astafiev Household');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));

    // Choose Other role and pick 2 permissions.
    roleRadios[2].click();
    await fixture.whenStable();
    const checkboxes = Array.from(
      el.querySelectorAll<HTMLInputElement>('app-permission-checklist input[type="checkbox"]'),
    );
    checkboxes[6].click(); // view_budget
    checkboxes[7].click(); // view_reports

    const relInput = el.querySelector<HTMLInputElement>('#invite-relationship')!;
    relInput.value = 'Grandparent';
    relInput.dispatchEvent(new Event('input'));

    const ttlSelect = el.querySelector<HTMLSelectElement>('#invite-ttl')!;
    ttlSelect.value = '336';
    ttlSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/invites`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      role: 'other',
      ttl_hours: 336,
      permissions: ['view_budget', 'view_reports'],
      relationship: 'Grandparent',
    });

    req.flush({
      token: 'inv_tok_secret_987',
      family_id: FAMILY_1,
      role: 'other',
      permissions: ['view_budget', 'view_reports'],
      relationship: 'Grandparent',
      created_by: 'owner-1',
      created_at: '2026-11-26T10:00:00Z',
      expires_at: '2026-12-10T10:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();

    const linkInput = el.querySelector<HTMLInputElement>('input[aria-label="Generated join link"]')!;
    expect(linkInput.value).toContain(`/join?familyId=${FAMILY_1}&token=inv_tok_secret_987`);
    expect(el.textContent).toContain('inv_tok_secret_987');
  });

  it('clears and omits permissions when switching back to Member before submitting', async () => {
    const fixture = TestBed.createComponent(InviteMemberDialog);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));

    roleRadios[2].click(); // Other
    await fixture.whenStable();
    el.querySelector<HTMLInputElement>('app-permission-checklist input[type="checkbox"]')!.click();

    roleRadios[0].click(); // Back to Member
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/invites`);
    expect(req.request.body).toEqual({
      role: 'member',
      ttl_hours: 168,
    });
    req.flush({
      token: 'inv_member_1',
      family_id: FAMILY_1,
      role: 'member',
      permissions: [],
      relationship: null,
      created_by: 'owner-1',
      created_at: '2026-11-26T10:00:00Z',
      expires_at: '2026-12-03T10:00:00Z',
    });
    await Promise.resolve();
    await fixture.whenStable();
  });

  it('maps RFC 9457 error responses into localized alert copy without leaking raw detail', async () => {
    const fixture = TestBed.createComponent(InviteMemberDialog);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/invites`);
    req.flush(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: 'INSUFFICIENT_ROLE',
        detail: 'INTERNAL ROLE_CHECK trace #44',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await Promise.resolve();
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe(i18n.t('errors.INSUFFICIENT_ROLE'));
    expect(el.textContent).not.toContain('INTERNAL ROLE_CHECK trace #44');
  });
});
