import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../i18n/services/i18n';
import { API_ERROR_CODES, type ProblemDetails } from '../models/problem-details';
import {
  isKnownApiErrorCode,
  isProblemDetails,
  resolveProblemErrorKey,
} from './problem-details';

describe('problem-details', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('recognizes valid RFC 9457 ProblemDetails payloads', () => {
    const valid: ProblemDetails = {
      type: 'urn:home-harmony:error:user_not_in_family',
      title: 'Forbidden',
      status: 403,
      detail: 'User is not active in family',
      code: 'USER_NOT_IN_FAMILY',
    };
    expect(isProblemDetails(valid)).toBe(true);
    expect(isProblemDetails({ status: 403, detail: 'missing code' })).toBe(false);
    expect(isProblemDetails(null)).toBe(false);
  });

  it('maps every one of the 31 backend API_ERROR_CODES to a distinct errors.<CODE> key', () => {
    expect(API_ERROR_CODES.length).toBe(31);
    const mappedKeys = new Set<string>();

    for (const code of API_ERROR_CODES) {
      expect(isKnownApiErrorCode(code)).toBe(true);
      const key = resolveProblemErrorKey({
        type: `urn:home-harmony:error:${code.toLowerCase()}`,
        title: 'Error',
        status: 400,
        detail: 'raw diagnostic string',
        code,
      });
      expect(key).toBe(`errors.${code}`);
      mappedKeys.add(key);
    }

    expect(mappedKeys.size).toBe(31);
  });

  it('maps unknown codes to errors.UNKNOWN_ERROR and status 0 to errors.NETWORK_ERROR', () => {
    expect(
      resolveProblemErrorKey({
        type: 'urn:home-harmony:error:something_new',
        title: 'Bad Request',
        status: 400,
        detail: 'internal diagnostic',
        code: 'SOMETHING_NEW',
      }),
    ).toBe('errors.UNKNOWN_ERROR');

    expect(resolveProblemErrorKey({ status: 0 })).toBe('errors.NETWORK_ERROR');
    expect(resolveProblemErrorKey('unexpected string error')).toBe('errors.UNKNOWN_ERROR');
  });

  it('never leaks raw backend detail strings through I18nService.translateError', () => {
    const i18n = TestBed.inject(I18nService);
    const secretDetail = 'secret db error: password=hunter2 stacktrace line 42';

    for (const locale of ['en', 'ru'] as const) {
      i18n.setLocale(locale);
      const translatedKnown = i18n.translateError({
        error: {
          type: 'urn:home-harmony:error:internal_error',
          title: 'Internal Server Error',
          status: 500,
          detail: secretDetail,
          code: 'INTERNAL_ERROR',
        },
      });
      const translatedUnknown = i18n.translateError({
        type: 'urn:home-harmony:error:unmapped_code',
        title: 'Bad Gateway',
        status: 502,
        detail: secretDetail,
        code: 'UNMAPPED_CODE',
      });

      expect(translatedKnown).not.toContain('hunter2');
      expect(translatedKnown).not.toContain(secretDetail);
      expect(translatedUnknown).not.toContain('hunter2');
      expect(translatedUnknown).not.toContain(secretDetail);
    }
  });
});
