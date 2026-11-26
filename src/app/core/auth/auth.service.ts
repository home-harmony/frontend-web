import { HttpBackend, HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ActiveFamilyStore } from '../context/active-family.store';
import { AuthNavigator } from './auth-navigator';
import {
  parseAndValidateIdToken,
  sanitizeReturnUrl,
  type AuthErrorReason,
  type AuthSession,
  type AuthUser,
  type CognitoTokenResponse,
} from './auth.models';
import { deriveCodeChallenge, generateCodeVerifier, generateOAuthState } from './pkce';

const SESSION_STORAGE_KEY = 'fl_auth_session';
const PKCE_VERIFIER_KEY = 'fl_pkce_verifier';
const OAUTH_STATE_KEY = 'fl_oauth_state';
const RETURN_URL_KEY = 'fl_return_url';

const CLOCK_SKEW_BUFFER_MS = 5_000;
const REFRESH_THRESHOLD_MS = 30_000;

export type CallbackOutcome =
  | { readonly ok: true; readonly returnUrl: string }
  | { readonly ok: false; readonly reason: AuthErrorReason };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(APP_CONFIG);
  private readonly navigator = inject(AuthNavigator);
  private readonly activeFamilyStore = inject(ActiveFamilyStore);
  // Use HttpBackend directly to bypass interceptors and avoid circular DI with authInterceptor.
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  private inFlightRefresh: Promise<boolean> | null = null;

  readonly session = signal<AuthSession | null>(this.restoreSession());
  readonly authError = signal<AuthErrorReason | null>(null);
  readonly user = computed<AuthUser | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed<boolean>(() => {
    const current = this.session();
    return current !== null && current.expiresAt > Date.now() + CLOCK_SKEW_BUFFER_MS;
  });

  async startLogin(returnUrl?: string): Promise<void> {
    const verifier = generateCodeVerifier();
    const challenge = await deriveCodeChallenge(verifier);
    const state = generateOAuthState();

    this.writeStorage(PKCE_VERIFIER_KEY, verifier);
    this.writeStorage(OAUTH_STATE_KEY, state);
    this.writeStorage(RETURN_URL_KEY, sanitizeReturnUrl(returnUrl));
    this.authError.set(null);

    const query = new HttpParams({
      fromObject: {
        response_type: 'code',
        client_id: this.config.cognitoClientId,
        redirect_uri: this.config.callbackUrl,
        scope: 'openid email profile',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
      },
    });

    const authorizeUrl = `${this.trimTrailingSlash(this.config.cognitoDomain)}/oauth2/authorize?${query.toString()}`;
    this.navigator.redirectTo(authorizeUrl);
  }

  async handleCallback(params: {
    readonly code?: string | null;
    readonly state?: string | null;
    readonly error?: string | null;
  }): Promise<CallbackOutcome> {
    const expectedState = this.consumeStorage(OAUTH_STATE_KEY);
    const verifier = this.consumeStorage(PKCE_VERIFIER_KEY);
    const returnUrl = sanitizeReturnUrl(this.consumeStorage(RETURN_URL_KEY));

    if (params.error) {
      return this.failCallback('OAUTH_ERROR');
    }
    if (!params.code) {
      return this.failCallback('MISSING_CODE');
    }
    if (!expectedState || !verifier || params.state !== expectedState) {
      return this.failCallback('STATE_MISMATCH');
    }

    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        client_id: this.config.cognitoClientId,
        code: params.code,
        redirect_uri: this.config.callbackUrl,
        code_verifier: verifier,
      },
    });

    try {
      const response = await this.postTokenRequest(body);
      const validation = parseAndValidateIdToken(response.id_token, this.config.cognitoClientId);
      if (!validation.ok) {
        return this.failCallback(validation.reason);
      }

      const nextSession: AuthSession = {
        idToken: response.id_token,
        accessToken: response.access_token,
        ...(response.refresh_token ? { refreshToken: response.refresh_token } : {}),
        expiresAt: validation.expiresAt,
        user: validation.user,
      };
      this.saveSession(nextSession);
      this.authError.set(null);
      return { ok: true, returnUrl };
    } catch {
      return this.failCallback('TOKEN_EXCHANGE_FAILED');
    }
  }

  async refreshSession(): Promise<boolean> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    this.inFlightRefresh = this.performRefresh().finally(() => {
      this.inFlightRefresh = null;
    });
    return this.inFlightRefresh;
  }

  async getValidIdToken(): Promise<string | null> {
    const current = this.session();
    if (!current) {
      return null;
    }
    if (current.expiresAt > Date.now() + REFRESH_THRESHOLD_MS) {
      return current.idToken;
    }
    if (!current.refreshToken) {
      return null;
    }
    const refreshed = await this.refreshSession();
    return refreshed ? (this.session()?.idToken ?? null) : null;
  }

  clearSession(): void {
    this.session.set(null);
    this.removeStorage(SESSION_STORAGE_KEY);
  }

  logout(redirectToCognito = true): void {
    this.clearSession();
    this.removeStorage(PKCE_VERIFIER_KEY);
    this.removeStorage(OAUTH_STATE_KEY);
    this.removeStorage(RETURN_URL_KEY);
    this.authError.set(null);
    this.activeFamilyStore.clear();

    if (redirectToCognito) {
      const query = new HttpParams({
        fromObject: {
          client_id: this.config.cognitoClientId,
          logout_uri: this.config.logoutUrl,
        },
      });
      const logoutUrl = `${this.trimTrailingSlash(this.config.cognitoDomain)}/logout?${query.toString()}`;
      this.navigator.redirectTo(logoutUrl);
    }
  }

  private async performRefresh(): Promise<boolean> {
    const current = this.session();
    if (!current?.refreshToken) {
      this.clearSession();
      return false;
    }

    const body = new HttpParams({
      fromObject: {
        grant_type: 'refresh_token',
        client_id: this.config.cognitoClientId,
        refresh_token: current.refreshToken,
      },
    });

    try {
      const response = await this.postTokenRequest(body);
      const validation = parseAndValidateIdToken(response.id_token, this.config.cognitoClientId);
      if (!validation.ok) {
        this.clearSession();
        this.authError.set(validation.reason);
        return false;
      }

      const nextSession: AuthSession = {
        idToken: response.id_token,
        accessToken: response.access_token,
        refreshToken: response.refresh_token ?? current.refreshToken,
        expiresAt: validation.expiresAt,
        user: validation.user,
      };
      this.saveSession(nextSession);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private postTokenRequest(body: HttpParams): Promise<CognitoTokenResponse> {
    const tokenUrl = `${this.trimTrailingSlash(this.config.cognitoDomain)}/oauth2/token`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    return firstValueFrom(
      this.rawHttp.post<CognitoTokenResponse>(tokenUrl, body.toString(), { headers }),
    );
  }

  private failCallback(reason: AuthErrorReason): CallbackOutcome {
    this.authError.set(reason);
    return { ok: false, reason };
  }

  private restoreSession(): AuthSession | null {
    const raw = this.readStorage(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (
        typeof parsed?.idToken !== 'string' ||
        typeof parsed?.expiresAt !== 'number' ||
        typeof parsed?.user?.userId !== 'string'
      ) {
        return null;
      }
      const validation = parseAndValidateIdToken(parsed.idToken, this.config.cognitoClientId);
      if (!validation.ok) {
        return parsed.refreshToken ? parsed : null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSession(next: AuthSession): void {
    this.session.set(next);
    this.writeStorage(SESSION_STORAGE_KEY, JSON.stringify(next));
  }

  private trimTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private readStorage(key: string): string | null {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage quota or restricted context errors.
    }
  }

  private removeStorage(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors.
    }
  }

  private consumeStorage(key: string): string | null {
    const val = this.readStorage(key);
    this.removeStorage(key);
    return val;
  }
}
