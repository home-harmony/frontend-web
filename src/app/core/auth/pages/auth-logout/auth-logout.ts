import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { TranslatePipe } from '../../../i18n/pipes/translate';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth-logout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmCardImports, TranslatePipe],
  template: `
    <main class="fl-standalone-shell fl-standalone-main">
      <section hlmCard class="w-full max-w-sm p-6 space-y-4">
        <p class="text-sm">{{ 'auth.signedOut' | t }}</p>
        <button hlmBtn type="button" size="sm" (click)="signIn()">
          {{ 'auth.signInAgain' | t }}
        </button>
      </section>
    </main>
  `,
})
export class AuthLogout implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout(false);
  }

  protected signIn(): void {
    void this.auth.startLogin('/');
  }
}
