import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { TranslationKey } from '../i18n/messages.en';
import { TranslatePipe } from '../i18n/translate.pipe';
import type { AuthErrorReason } from './auth.models';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div class="w-full max-w-sm border border-border bg-card text-card-foreground p-6 space-y-4">
        @if (errorKey(); as key) {
          <p class="text-sm text-destructive">{{ key | t }}</p>
          <button
            type="button"
            class="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground"
            (click)="retryLogin()"
          >
            {{ 'auth.retrySignIn' | t }}
          </button>
        } @else {
          <p class="text-sm text-muted-foreground">{{ 'auth.signingIn' | t }}</p>
        }
      </div>
    </main>
  `,
})
export class AuthCallbackComponent implements OnInit {
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
