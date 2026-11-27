import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { WorkspaceStore } from '../stores/workspace';

export const workspaceRequiredGuard: CanActivateFn = async () => {
  const store = inject(WorkspaceStore);
  const router = inject(Router);

  try {
    const families = await store.loadFamilies();
    return families.length > 0 ? true : router.createUrlTree(['/onboarding']);
  } catch {
    return router.createUrlTree(['/onboarding']);
  }
};

export const onboardingGuard: CanActivateFn = async () => {
  const store = inject(WorkspaceStore);
  const router = inject(Router);

  try {
    const families = await store.loadFamilies();
    return families.length === 0 ? true : router.createUrlTree(['/workspace']);
  } catch {
    return true;
  }
};
