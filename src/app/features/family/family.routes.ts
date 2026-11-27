import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth';
import { onboardingGuard } from '../../core/context/guards/workspace';

export const familyStandaloneRoutes: Routes = [
  {
    path: 'onboarding',
    canActivate: [authGuard, onboardingGuard],
    loadComponent: () =>
      import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'onboarding/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/create-family/create-family').then((m) => m.CreateFamily),
  },
  {
    path: 'join',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/invite-accept/invite-accept').then((m) => m.InviteAccept),
  },
];

export const familyWorkspaceRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/workspace-overview/workspace-overview').then((m) => m.WorkspaceOverview),
  },
  {
    path: 'members',
    loadComponent: () =>
      import('./pages/members-directory/members-directory').then((m) => m.MembersDirectory),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/family-settings/family-settings').then((m) => m.FamilySettings),
  },
];
