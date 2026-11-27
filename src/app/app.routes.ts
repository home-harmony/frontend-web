import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth';
import { workspaceRequiredGuard } from './core/context/guards/workspace';
import { familyStandaloneRoutes } from './features/family/family.routes';

export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./core/auth/pages/auth-callback/auth-callback').then((m) => m.AuthCallback),
  },
  {
    path: 'auth/logout',
    loadComponent: () =>
      import('./core/auth/pages/auth-logout/auth-logout').then((m) => m.AuthLogout),
  },
  ...familyStandaloneRoutes,
  {
    path: 'workspace',
    canActivate: [authGuard, workspaceRequiredGuard],
    loadComponent: () =>
      import('./shared/components/app-shell/app-shell').then((m) => m.AppShell),
    loadChildren: () =>
      import('./features/family/family.routes').then((m) => m.familyWorkspaceRoutes),
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: '**', redirectTo: 'workspace' },
];
