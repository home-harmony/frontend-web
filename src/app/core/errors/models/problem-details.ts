export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code: string;
}

export const API_ERROR_CODES = [
  // Auth / Context (8)
  'MISSING_CLAIMS',
  'INVALID_CLAIMS',
  'UNVERIFIED_EMAIL',
  'MISSING_FAMILY_ID',
  'INVALID_FAMILY_ID',
  'USER_NOT_IN_FAMILY',
  'FAMILY_ID_MISMATCH',
  'INSUFFICIENT_ROLE',
  // Request / Infrastructure (3)
  'INVALID_JSON',
  'INVALID_MEMBER_ID',
  'INTERNAL_ERROR',
  // Domain / Lifecycle (20)
  'FAMILY_NOT_FOUND',
  'MEMBER_NOT_FOUND',
  'INVITE_TOKEN_NOT_FOUND',
  'FAMILY_DELETED',
  'TOKEN_EXPIRED',
  'TOKEN_ALREADY_USED',
  'MEMBER_ALREADY_EXISTS',
  'DUPLICATE_OWNER',
  'CANNOT_REMOVE_OWNER',
  'CURRENCY_MISMATCH',
  'NEGATIVE_AMOUNT',
  'ARITHMETIC_OVERFLOW',
  'INVALID_CURRENCY_CODE',
  'INVALID_FAMILY_NAME',
  'INVALID_DISPLAY_NAME',
  'INVALID_EMAIL',
  'INVALID_RELATIONSHIP',
  'INVALID_INVITE_TTL',
  'INVALID_PAYMENT_SPLIT',
  'INVARIANT_VIOLATION',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
