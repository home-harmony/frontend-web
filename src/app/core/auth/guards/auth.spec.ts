import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth';
import { AuthService } from '../services/auth';

describe('authGuard', () => {
  it('allows navigation when authenticated', async () => {
    const startLogin = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            getValidIdToken: vi.fn(),
            startLogin,
          },
        },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/families/123' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
    expect(startLogin).not.toHaveBeenCalled();
  });

  it('redirects to login preserving deep-link invite URL when unauthenticated', async () => {
    const startLogin = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            getValidIdToken: vi.fn().mockResolvedValue(null),
            startLogin,
          },
        },
      ],
    });

    const deepLink = '/join?familyId=11111111-1111-4111-8111-111111111111&token=22222222-2222-4222-8222-222222222222';
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: deepLink } as RouterStateSnapshot),
    );
    expect(result).toBe(false);
    expect(startLogin).toHaveBeenCalledWith(deepLink);
  });
});
