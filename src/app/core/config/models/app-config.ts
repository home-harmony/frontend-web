import { InjectionToken } from '@angular/core';

export interface AppConfig {
  readonly production: boolean;
  readonly apiUrl: string;
  readonly cognitoDomain: string;
  readonly cognitoClientId: string;
  readonly callbackUrl: string;
  readonly logoutUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
