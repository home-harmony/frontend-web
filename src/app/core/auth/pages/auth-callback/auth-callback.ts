import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { TranslationKey } from '../../../i18n/models/messages-en';
import { TranslatePipe } from '../../../i18n/pipes/translate';
import type { AuthErrorReason } from '../../models/auth';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmCardImports, TranslatePipe],
  template: `
    <main class="fl-standalone-shell fl-standalone-main">
      <section hlmCard class="w-full max-w-sm p-6 space-y-4">
        @if (errorKey(); as key) {
          <p class="fl-field-error">{{ key | t }}</p>
          <button hlmBtn type="button" size="sm" (click)="retryLogin()">
            {{ 'auth.retrySignIn' | t }}
          </button>
        } @else {
          <p class="fl-page-subtitle">{{ 'auth.signingIn' | t }}</p>
        }
      </section>
    </main>
  `,
})
export class AuthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly errorReason = signal<AuthErrorReason | null>(null);
  protected readonly errorKey = computed<TranslationKey | null>(() => {
    const reason = this.errorReason();
    return reason ? (`auth.error.${reason}` as const) : null;
  });

  async ngOnInit(): Promise<void> {
    const query = this.route.snapshot.queryParamMap;
    const outcome = await this.auth.handleCallback({
      code: query.get('code'),
      state: query.get('state'),
      error: query.get('error'),
    });

    if (outcome.ok) {
      await this.router.navigateByUrl(outcome.returnUrl, { replaceUrl: true });
      return;
    }

    this.errorReason.set(outcome.reason);
  }

  protected retryLogin(): void {
    void this.auth.startLogin('/');
  }
}
