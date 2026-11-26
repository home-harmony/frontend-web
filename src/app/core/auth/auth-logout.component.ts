import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-logout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div class="w-full max-w-sm border border-border bg-card text-card-foreground p-6 space-y-4">
        <p class="text-sm text-foreground">{{ 'auth.signedOut' | t }}</p>
        <button
          type="button"
          class="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground"
          (click)="signIn()"
        >
          {{ 'auth.signInAgain' | t }}
        </button>
      </div>
    </main>
  `,
})
export class AuthLogoutComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout(false);
  }

  protected signIn(): void {
    void this.auth.startLogin('/');
  }
}
