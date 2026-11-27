import type { TranslationKey } from '../../i18n/models/messages-en';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type ProblemDetails,
} from '../models/problem-details';

const KNOWN_CODE_SET: ReadonlySet<string> = new Set<string>(API_ERROR_CODES);

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['type'] === 'string' &&
    typeof candidate['title'] === 'string' &&
    typeof candidate['status'] === 'number' &&
    typeof candidate['detail'] === 'string' &&
    typeof candidate['code'] === 'string'
  );
}

export function isKnownApiErrorCode(code: string): code is ApiErrorCode {
  return KNOWN_CODE_SET.has(code);
}

export function resolveProblemErrorKey(input: unknown): TranslationKey {
  if (isProblemDetails(input)) {
    return isKnownApiErrorCode(input.code) ? `errors.${input.code}` : 'errors.UNKNOWN_ERROR';
  }

  if (typeof input === 'object' && input !== null) {
    const candidate = input as Record<string, unknown>;
    if ('error' in candidate && isProblemDetails(candidate['error'])) {
      const inner = candidate['error'];
      return isKnownApiErrorCode(inner.code) ? `errors.${inner.code}` : 'errors.UNKNOWN_ERROR';
    }
    if (candidate['status'] === 0) {
      return 'errors.NETWORK_ERROR';
    }
  }

  return 'errors.UNKNOWN_ERROR';
}
