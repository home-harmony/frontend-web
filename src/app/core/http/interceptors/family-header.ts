import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../../config/models/app-config';
import { ActiveFamilyStore } from '../../context/stores/active-family';
import { requiresFamilyHeader } from '../utils/api-route-scope';

export const familyHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG);
  if (!requiresFamilyHeader(req.method, req.url, config.apiUrl) || req.headers.has('X-Family-Id')) {
    return next(req);
  }

  const familyId = inject(ActiveFamilyStore).activeFamilyId();
  if (!familyId) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-Family-Id': familyId } }));
};
