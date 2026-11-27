import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MemberResponse } from '../../models/family-dto';
import { AuthService } from '../../../../core/auth/services/auth';
import { APP_CONFIG, type AppConfig } from '../../../../core/config/models/app-config';
import { problemDetailsInterceptor } from '../../../../core/http/interceptors/problem-details';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { RemoveMemberDialog } from './remove-member-dialog';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

const TARGET_MEMBER: MemberResponse = {
  id: MEMBER_ID,
  family_id: FAMILY_1,
  user_id: 'user-3',
  display_name: 'Max A.',
  role: 'child',
  permissions: [],
  relationship: 'Son',
  joined_at: '2026-11-22T00:00:00Z',
};

describe('RemoveMemberDialog', () => {
  let httpTesting: HttpTestingController;
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RemoveMemberDialog],
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

  it('calls DELETE /families/{id}/members/{mid} and emits removed on 204 No Content', async () => {
    const fixture = TestBed.createComponent(RemoveMemberDialog);
    const removedSpy = vi.fn();
    fixture.componentRef.instance.removed.subscribe(removedSpy);
    fixture.componentRef.setInput('familyId', FAMILY_1);
    fixture.componentRef.setInput('member', TARGET_MEMBER);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const confirmBtn = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === i18n.t('removeMemberDialog.confirm'),
    )!;
    confirmBtn.click();
    await Promise.resolve();

    const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/${MEMBER_ID}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();

    expect(removedSpy).toHaveBeenCalledWith(MEMBER_ID);
  });

  it.each([
    [409, 'CANNOT_REMOVE_OWNER'],
    [403, 'INSUFFICIENT_ROLE'],
    [404, 'MEMBER_NOT_FOUND'],
  ] as const)(
    'maps HTTP %s (%s) to localized error alert without leaking raw backend detail',
    async (status, code) => {
      const fixture = TestBed.createComponent(RemoveMemberDialog);
      fixture.componentRef.setInput('familyId', FAMILY_1);
      fixture.componentRef.setInput('member', TARGET_MEMBER);
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      const confirmBtn = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === i18n.t('removeMemberDialog.confirm'),
      )!;
      confirmBtn.click();
      await Promise.resolve();

      const req = httpTesting.expectOne(`${API_URL}/families/${FAMILY_1}/members/${MEMBER_ID}`);
      req.flush(
        {
          type: 'about:blank',
          title: code,
          status,
          code,
          detail: `RAW_${code}_TRACE`,
        },
        { status, statusText: 'Error' },
      );
      await Promise.resolve();
      await fixture.whenStable();

      const alert = el.querySelector('[role="alert"]');
      const expectedKey = `errors.${code}` as const;
      expect(alert?.textContent?.trim()).toBe(i18n.t(expectedKey));
      expect(el.textContent).not.toContain(`RAW_${code}_TRACE`);
    },
  );
});
