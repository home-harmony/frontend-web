import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthNavigator {
  redirectTo(url: string): void {
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
  }
}
