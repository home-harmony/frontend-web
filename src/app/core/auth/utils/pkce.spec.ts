import { parseAndValidateIdToken, sanitizeReturnUrl } from './token-validator';
import {
  base64UrlEncode,
  decodeJwtPayload,
  deriveCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from './pkce';

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256' })));
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${header}.${body}.signature`;
}

describe('PKCE & ID token validation', () => {
  const clientId = 'web-client-123';
  const nowSec = 1_700_000_000;

  it('derives the RFC 7636 S256 code challenge for the standard test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await deriveCodeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('generates URL-safe verifiers and OAuth states without padding', () => {
    const verifier = generateCodeVerifier();
    const state = generateOAuthState();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('decodes UTF-8 JWT payloads and rejects malformed tokens', () => {
    const token = makeJwt({ sub: 'user-1', name: 'Алиса' });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', name: 'Алиса' });
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.!!!.c')).toBeNull();
  });

  it('accepts a valid Cognito IdToken with verified email', () => {
    const token = makeJwt({
      sub: '11111111-1111-4111-8111-111111111111',
      token_use: 'id',
      aud: clientId,
      exp: nowSec + 3600,
      email: '  alice@example.com  ',
      email_verified: true,
      name: 'Alice',
    });

    const result = parseAndValidateIdToken(token, clientId, nowSec);
    expect(result).toEqual({
      ok: true,
      user: {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'alice@example.com',
        name: 'Alice',
      },
      expiresAt: (nowSec + 3600) * 1000,
    });
  });

  it('rejects access tokens, wrong audience, expired tokens, and unverified emails', () => {
    const accessToken = makeJwt({
      sub: 'user-1',
      token_use: 'access',
      client_id: clientId,
      exp: nowSec + 3600,
    });
    expect(parseAndValidateIdToken(accessToken, clientId, nowSec)).toEqual({
      ok: false,
      reason: 'INVALID_ID_TOKEN',
    });

    const wrongAud = makeJwt({
      sub: 'user-1',
      token_use: 'id',
      aud: 'other-client',
      exp: nowSec + 3600,
      email: 'a@b.com',
      email_verified: true,
    });
    expect(parseAndValidateIdToken(wrongAud, clientId, nowSec)).toEqual({
      ok: false,
      reason: 'INVALID_ID_TOKEN',
    });

    const expired = makeJwt({
      sub: 'user-1',
      token_use: 'id',
      aud: clientId,
      exp: nowSec - 1,
      email: 'a@b.com',
      email_verified: true,
    });
    expect(parseAndValidateIdToken(expired, clientId, nowSec)).toEqual({
      ok: false,
      reason: 'INVALID_ID_TOKEN',
    });

    const unverified = makeJwt({
      sub: 'user-1',
      token_use: 'id',
      aud: clientId,
      exp: nowSec + 3600,
      email: 'a@b.com',
      email_verified: false,
    });
    expect(parseAndValidateIdToken(unverified, clientId, nowSec)).toEqual({
      ok: false,
      reason: 'UNVERIFIED_EMAIL',
    });
  });

  it('sanitizes returnUrl against open redirects', () => {
    expect(sanitizeReturnUrl('/join?familyId=123&token=abc')).toBe(
      '/join?familyId=123&token=abc',
    );
    expect(sanitizeReturnUrl('https://evil.example/phish')).toBe('/');
    expect(sanitizeReturnUrl('//evil.example/phish')).toBe('/');
    expect(sanitizeReturnUrl(null)).toBe('/');
  });
});
