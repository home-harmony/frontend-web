import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './core/auth/auth-callback.component';
import { AuthLogoutComponent } from './core/auth/auth-logout.component';

export const routes: Routes = [
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'auth/logout', component: AuthLogoutComponent },
];
