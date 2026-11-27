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
import { APP_CONFIG } from './core/config/models/app-config';
import { authInterceptor } from './core/http/interceptors/auth';
import { familyHeaderInterceptor } from './core/http/interceptors/family-header';
import { problemDetailsInterceptor } from './core/http/interceptors/problem-details';
import { ThemeService } from './core/theme/services/theme';

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
