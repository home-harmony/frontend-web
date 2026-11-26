import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }

  const token = await auth.getValidIdToken();
  if (token) {
    return true;
  }

  void auth.startLogin(state.url);
  return false;
};
