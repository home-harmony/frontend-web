import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './core/auth/auth-callback.component';
import { AuthLogoutComponent } from './core/auth/auth-logout.component';
import { authGuard } from './core/auth/auth.guard';
import { onboardingGuard, workspaceRequiredGuard } from './core/context/workspace.guards';
import { WorkspaceOverviewComponent } from './features/family/workspace-overview.component';
import { CreateFamilyComponent } from './features/onboarding/create-family.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { AppShellComponent } from './shared/components/app-shell.component';

export const routes: Routes = [
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'auth/logout', component: AuthLogoutComponent },
  {
    path: 'onboarding',
    canActivate: [authGuard, onboardingGuard],
    component: OnboardingComponent,
  },
  {
    path: 'onboarding/create',
    canActivate: [authGuard],
    component: CreateFamilyComponent,
  },
  {
    path: 'workspace',
    canActivate: [authGuard, workspaceRequiredGuard],
    component: AppShellComponent,
    children: [{ path: '', component: WorkspaceOverviewComponent }],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: '**', redirectTo: 'workspace' },
];
