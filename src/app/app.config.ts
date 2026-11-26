import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config';
import { authInterceptor } from './core/http/auth.interceptor';
import { familyHeaderInterceptor } from './core/http/family-header.interceptor';
import { problemDetailsInterceptor } from './core/http/problem-details.interceptor';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([problemDetailsInterceptor, authInterceptor, familyHeaderInterceptor]),
    ),
    { provide: APP_CONFIG, useValue: environment },
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ],
};
