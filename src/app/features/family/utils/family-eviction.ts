import { ApiHttpError } from '../../../core/http/models/api-http-error';

export function isFamilyEvictionError(err: unknown): boolean {
  return (
    err instanceof ApiHttpError &&
    (err.code === 'FAMILY_DELETED' || err.code === 'USER_NOT_IN_FAMILY')
  );
}
