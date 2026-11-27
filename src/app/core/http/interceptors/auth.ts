import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { APP_CONFIG } from '../../config/models/app-config';
import { isApiRequest } from '../utils/api-route-scope';

export const RETRIED_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  if (!isApiRequest(req.url, config.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.getValidIdToken()).pipe(
    switchMap((token) => {
      const authorizedReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

      return next(authorizedReq).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }

          const alreadyRetried = req.context.get(RETRIED_AFTER_REFRESH);
          const hasRefresh = Boolean(auth.session()?.refreshToken);
          if (alreadyRetried || !hasRefresh) {
            auth.clearSession();
            void auth.startLogin(router.url);
            return throwError(() => error);
          }

          return from(auth.refreshSession()).pipe(
            switchMap((refreshed) => {
              const nextToken = refreshed ? auth.session()?.idToken : null;
              if (!refreshed || !nextToken) {
                auth.clearSession();
                void auth.startLogin(router.url);
                return throwError(() => error);
              }
              const retriedReq = req.clone({
                context: req.context.set(RETRIED_AFTER_REFRESH, true),
                setHeaders: { Authorization: `Bearer ${nextToken}` },
              });
              return next(retriedReq);
            }),
          );
        }),
      );
    }),
  );
};
