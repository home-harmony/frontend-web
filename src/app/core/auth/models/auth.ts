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

export type CallbackOutcome =
  | { readonly ok: true; readonly returnUrl: string }
  | { readonly ok: false; readonly reason: AuthErrorReason };
