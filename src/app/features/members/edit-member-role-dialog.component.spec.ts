import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MemberResponse } from '../../core/api/family.dto';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config';
import { problemDetailsInterceptor } from '../../core/http/problem-details.interceptor';
import { I18nService } from '../../core/i18n/i18n.service';
import { EditMemberRoleDialogComponent } from './edit-member-role-dialog.component';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

function makeMember(overrides: Partial<MemberResponse> = {}): MemberResponse {
  return {
    id: MEMBER_ID,
    family_id: FAMILY_1,
    user_id: 'user-2',
    display_name: 'Olga V.',
    role: 'member',
    permissions: [],
    relationship: 'Grandmother',
    joined_at: '2026-11-24T00:00:00Z',
    ...overrides,
  };
}

describe('EditMemberRoleDialogComponent', () => {
  let httpTesting: HttpTestingController;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EditMemberRoleDialogComponent],
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

  it('excludes Owner role, enforces no-op submit guard, and toggles checklist strictly for Other', async () => {
    const fixture = TestBed.createComponent(EditMemberRoleDialogComponent);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    fixture.componentRef.setInput('member', makeMember({ role: 'member' }));
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    expect(roleRadios.map((b) => b.textContent?.trim())).toEqual(['Member', 'Child', 'Other']);

    const submitBtn = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitBtn.disabled).toBe(true);
    expect(el.querySelector('app-permission-checklist')).toBeNull();

    // Select Child -> changes exist -> Save enabled.
    roleRadios[1].click();
    await fixture.whenStable();
    expect(submitBtn.disabled).toBe(false);
    expect(el.querySelector('app-permission-checklist')).toBeNull();

    // Return to Member -> back to original -> Save disabled again.
    roleRadios[0].click();
    await fixture.whenStable();
    expect(submitBtn.disabled).toBe(true);

    // Select Other -> checklist visible -> Save enabled.
    roleRadios[2].click();
    await fixture.whenStable();
    expect(submitBtn.disabled).toBe(false);
    expect(el.querySelector('app-permission-checklist')).not.toBeNull();
  });

  it('submits custom permissions for Other and omits permissions when switching back to Member', async () => {
    const fixture = TestBed.createComponent(EditMemberRoleDialogComponent);
    const updatedSpy = vi.fn();
    fixture.componentRef.instance.updated.subscribe(updatedSpy);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    fixture.componentRef.setInput('member', makeMember({ role: 'member' }));
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));

    roleRadios[2].click(); // Other
    await fixture.whenStable();
    const checkboxes = Array.from(
      el.querySelectorAll<HTMLInputElement>('app-permission-checklist input[type="checkbox"]'),
    );
    checkboxes[6].click(); // view_budget
    checkboxes[7].click(); // view_reports
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req1 = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/${MEMBER_ID}/role`);
    expect(req1.request.method).toBe('PATCH');
    expect(req1.request.body).toEqual({
      role: 'other',
      permissions: ['view_budget', 'view_reports'],
    });
    const updatedOther = makeMember({
      role: 'other',
      permissions: ['view_budget', 'view_reports'],
    });
    req1.flush(updatedOther);
    await Promise.resolve();
    expect(updatedSpy).toHaveBeenCalledWith(updatedOther);

    // Now test changing an Other member back to Member -> must omit permissions.
    fixture.componentRef.setInput('member', updatedOther);
    await fixture.whenStable();
    roleRadios[0].click(); // Member
    await fixture.whenStable();

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();

    const req2 = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/${MEMBER_ID}/role`);
    expect(req2.request.body).toEqual({ role: 'member' });
    req2.flush(makeMember({ role: 'member', permissions: [] }));
    await Promise.resolve();
  });

  it.each([
    [409, 'DUPLICATE_OWNER'],
    [403, 'INSUFFICIENT_ROLE'],
  ] as const)(
    'maps HTTP %s (%s) to localized error alert without leaking raw backend detail',
    async (status, code) => {
      const fixture = TestBed.createComponent(EditMemberRoleDialogComponent);
      fixture.componentRef.setInput('familyId', FAMILY_1);
      fixture.componentRef.setInput('member', makeMember({ role: 'member' }));
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const roleRadios = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
      roleRadios[1].click();
      await fixture.whenStable();

      el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await Promise.resolve();

      const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/${MEMBER_ID}/role`);
      req.flush(
        {
          type: 'about:blank',
          title: code,
          status,
          code,
          detail: `RAW_${code}_DIAGNOSTIC`,
        },
        { status, statusText: 'Error' },
      );
      await Promise.resolve();
      await fixture.whenStable();

      const alert = el.querySelector('[role="alert"]');
      const expectedKey = `errors.${code}` as const;
      expect(alert?.textContent?.trim()).toBe(i18n.t(expectedKey));
      expect(el.textContent).not.toContain(`RAW_${code}_DIAGNOSTIC`);
    },
  );
});
