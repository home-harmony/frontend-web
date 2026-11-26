import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type ActivatedRouteSnapshot, type RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { problemDetailsInterceptor } from '../http/problem-details.interceptor';
import { ActiveFamilyStore } from './active-family.store';
import { onboardingGuard, workspaceRequiredGuard } from './workspace.guards';
import { WorkspaceStore } from './workspace.store';

const API_URL = 'https://api.example.test/dev';
const FAMILY_1 = '11111111-1111-4111-8111-111111111111';
const FAMILY_2 = '22222222-2222-4222-8222-222222222222';
const STALE_ID = '99999999-9999-4999-8999-999999999999';

const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: API_URL,
  cognitoDomain: 'https://auth.example.test',
  cognitoClientId: 'client-abc',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};

describe('WorkspaceStore & workspace guards', () => {
  let store: WorkspaceStore;
  let activeFamilyStore: ActiveFamilyStore;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: TEST_CONFIG },
        { provide: AuthService, useValue: { getValidIdToken: vi.fn().mockResolvedValue('tok') } },
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(WorkspaceStore);
    activeFamilyStore = TestBed.inject(ActiveFamilyStore);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('handles 0 families and clears activeFamilyId', async () => {
    activeFamilyStore.setActiveFamilyId(FAMILY_1);

    const guardPromise = TestBed.runInInjectionContext(() =>
      workspaceRequiredGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    const req = httpTesting.expectOne(`${API_URL}/profile/families`);
    req.flush({ items: [] });

    const guardResult = await guardPromise;
    expect(guardResult).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(guardResult as UrlTree)).toBe('/onboarding');
    expect(store.activeFamilyId()).toBeNull();
    expect(store.families()).toEqual([]);
  });

  it('auto-selects single family and redirects onboardingGuard to /workspace', async () => {
    const loadPromise = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Solo Household', home_currency: 'MDL' },
          membership: { role: 'owner', display_name: 'Dmitri' },
        },
      ],
    });
    await loadPromise;

    expect(store.activeFamilyId()).toBe(FAMILY_1);
    expect(store.activeWorkspace()?.family.name).toBe('Solo Household');

    const onboardingResult = await TestBed.runInInjectionContext(() =>
      onboardingGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(onboardingResult).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(onboardingResult as UrlTree)).toBe('/workspace');
  });

  it('preserves valid stored family or falls back when stale, and bumps switchVersion on switch', async () => {
    activeFamilyStore.setActiveFamilyId(STALE_ID);

    const loadPromise = store.loadFamilies();
    httpTesting.expectOne(`${API_URL}/profile/families`).flush({
      items: [
        {
          family: { id: FAMILY_1, name: 'Primary', home_currency: 'MDL' },
          membership: { role: 'owner', display_name: 'Dmitri' },
        },
        {
          family: { id: FAMILY_2, name: 'Parents', home_currency: 'EUR' },
          membership: { role: 'member', display_name: 'Dmitri' },
        },
      ],
    });
    await loadPromise;

    expect(store.activeFamilyId()).toBe(FAMILY_1);
    expect(store.switchVersion()).toBe(0);

    expect(store.selectFamily(FAMILY_2)).toBe(true);
    expect(store.activeFamilyId()).toBe(FAMILY_2);
    expect(store.activeRole()).toBe('member');
    expect(store.switchVersion()).toBe(1);

    expect(store.selectFamily(STALE_ID)).toBe(false);
    expect(store.activeFamilyId()).toBe(FAMILY_2);
  });

  it('prepends and activates newly created family and clears state on reset()', async () => {
    const createPromise = store.createFamily({
      name: 'New Home',
      home_currency: 'EUR',
      owner_display_name: 'Alice',
    });

    const req = httpTesting.expectOne(`${API_URL}/families`);
    expect(req.request.method).toBe('POST');
    req.flush({
      id: FAMILY_2,
      name: 'New Home',
      home_currency: 'EUR',
      owner_member_id: '33333333-3333-4333-8333-333333333333',
      created_at: '2026-11-26T00:00:00Z',
    });

    await createPromise;
    expect(store.activeFamilyId()).toBe(FAMILY_2);
    expect(store.activeRole()).toBe('owner');
    expect(store.families().length).toBe(1);

    store.reset();
    expect(store.families()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.activeFamilyId()).toBeNull();
  });
});
