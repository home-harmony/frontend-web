import { decodeJwtPayload } from './pkce';

export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly name?: string;
}

export interface AuthSession {
  readonly idToken: string;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt: number;
  readonly user: AuthUser;
}

export interface CognitoTokenResponse {
  readonly id_token: string;
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly expires_in: number;
  readonly token_type: string;
}

export type AuthErrorReason =
  | 'STATE_MISMATCH'
  | 'MISSING_CODE'
  | 'UNVERIFIED_EMAIL'
  | 'INVALID_ID_TOKEN'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'OAUTH_ERROR';

export type IdTokenValidationResult =
  | { readonly ok: true; readonly user: AuthUser; readonly expiresAt: number }
  | { readonly ok: false; readonly reason: 'UNVERIFIED_EMAIL' | 'INVALID_ID_TOKEN' };

export function parseAndValidateIdToken(
  idToken: string,
  expectedClientId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): IdTokenValidationResult {
  const payload = decodeJwtPayload(idToken);
  if (!payload) {
    return { ok: false, reason: 'INVALID_ID_TOKEN' };
  }

  const tokenUse = payload['token_use'];
  const aud = payload['aud'];
  const sub = payload['sub'];
  const exp = payload['exp'];
  const email = payload['email'];
  const emailVerified = payload['email_verified'];

  if (
    tokenUse !== 'id' ||
    aud !== expectedClientId ||
    typeof sub !== 'string' ||
    sub.trim().length === 0 ||
    typeof exp !== 'number' ||
    exp <= nowSeconds
  ) {
    return { ok: false, reason: 'INVALID_ID_TOKEN' };
  }

  if (emailVerified !== true && emailVerified !== 'true') {
    return { ok: false, reason: 'UNVERIFIED_EMAIL' };
  }

  if (typeof email !== 'string' || email.trim().length === 0) {
    return { ok: false, reason: 'INVALID_ID_TOKEN' };
  }

  const rawName = payload['name'];
  const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : undefined;

  return {
    ok: true,
    user: {
      userId: sub,
      email: email.trim(),
      ...(name !== undefined ? { name } : {}),
    },
    expiresAt: exp * 1000,
  };
}

export function sanitizeReturnUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }
  return raw;
}
