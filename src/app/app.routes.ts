import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { onboardingGuard, workspaceRequiredGuard } from './core/context/workspace.guards';

export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./core/auth/auth-callback.component').then((m) => m.AuthCallbackComponent),
  },
  {
    path: 'auth/logout',
    loadComponent: () =>
      import('./core/auth/auth-logout.component').then((m) => m.AuthLogoutComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard, onboardingGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'onboarding/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/create-family.component').then((m) => m.CreateFamilyComponent),
  },
  {
    path: 'workspace',
    canActivate: [authGuard, workspaceRequiredGuard],
    loadComponent: () =>
      import('./shared/components/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/family/workspace-overview.component').then(
            (m) => m.WorkspaceOverviewComponent,
          ),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./features/members/members-directory.component').then(
            (m) => m.MembersDirectoryComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/family/family-settings.component').then(
            (m) => m.FamilySettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'join',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/invite-accept/invite-accept.component').then(
        (m) => m.InviteAcceptComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: '**', redirectTo: 'workspace' },
];
