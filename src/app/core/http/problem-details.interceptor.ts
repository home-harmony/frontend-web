import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isProblemDetails } from '../errors/problem-details';
import { I18nService } from '../i18n/i18n.service';
import { ApiHttpError } from './api-http-error';

export const problemDetailsInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const problem = isProblemDetails(error.error) ? error.error : null;
      const code = problem ? problem.code : error.status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR';
      const localizedMessage = i18n.translateError(error);

      return throwError(
        () =>
          new ApiHttpError({
            status: error.status,
            code,
            localizedMessage,
            problem,
            cause: error,
          }),
      );
    }),
  );
};
