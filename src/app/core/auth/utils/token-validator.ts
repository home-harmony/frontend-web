import type { IdTokenValidationResult } from '../models/auth';
import { decodeJwtPayload } from './pkce';

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
