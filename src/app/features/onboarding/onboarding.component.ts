import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TopControlsComponent } from '../../shared/components/top-controls.component';
import { parseInviteInput } from './invite-link.parser';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, HlmInput, TopControlsComponent, TranslatePipe],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <header
        class="border-b border-border bg-card text-card-foreground px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="w-6 h-6 inline-flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground"
          >
            F
          </span>
          <span class="text-sm font-semibold tracking-tight">{{ 'app.name' | t }}</span>
          @if (auth.user(); as user) {
            <span hlmBadge variant="outline" class="hidden sm:inline-flex">{{ user.email }}</span>
          }
        </div>
        <app-top-controls />
      </header>

      <main class="flex-1 flex items-center justify-center p-4 md:p-8">
        <div class="w-full max-w-3xl space-y-5">
          <div class="space-y-1.5">
            <span hlmBadge variant="outline" class="font-mono">{{ 'onboarding.badge' | t }}</span>
            <h1 class="text-xl font-semibold tracking-tight">{{ 'onboarding.title' | t }}</h1>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ 'onboarding.subtitle' | t }}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section hlmCard class="p-5 flex flex-col justify-between gap-4">
              <div class="space-y-2">
                <h2 class="text-sm font-semibold">{{ 'onboarding.create.title' | t }}</h2>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ 'onboarding.create.description' | t }}
                </p>
              </div>
              <button
                hlmBtn
                type="button"
                class="self-start"
                (click)="goToCreate()"
              >
                {{ 'onboarding.create.action' | t }}
              </button>
            </section>

            <section hlmCard class="p-5 flex flex-col justify-between gap-4">
              <div class="space-y-2.5">
                <h2 class="text-sm font-semibold">{{ 'onboarding.join.title' | t }}</h2>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ 'onboarding.join.description' | t }}
                </p>
                <div class="space-y-1 pt-1">
                  <label for="invite-link-input" class="text-xs font-medium block">
                    {{ 'onboarding.join.inputLabel' | t }}
                  </label>
                  <input
                    id="invite-link-input"
                    hlmInput
                    type="text"
                    class="font-mono"
                    [value]="inviteInput()"
                    [placeholder]="'onboarding.join.placeholder' | t"
                    (input)="onInviteInput($event)"
                  />
                </div>
                @if (invalidInvite()) {
                  <p class="text-xs text-destructive">{{ 'onboarding.join.invalid' | t }}</p>
                }
              </div>
              <button
                hlmBtn
                type="button"
                variant="outline"
                class="self-start"
                (click)="submitInvite()"
              >
                {{ 'onboarding.join.action' | t }}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class OnboardingComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly inviteInput = signal('');
  protected readonly invalidInvite = signal(false);

  protected goToCreate(): void {
    void this.router.navigate(['/onboarding/create']);
  }

  protected onInviteInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inviteInput.set(target.value);
    if (this.invalidInvite()) {
      this.invalidInvite.set(false);
    }
  }

  protected submitInvite(): void {
    const parsed = parseInviteInput(this.inviteInput());
    if (!parsed) {
      this.invalidInvite.set(true);
      return;
    }
    void this.router.navigate(['/join'], {
      queryParams: { familyId: parsed.familyId, token: parsed.token },
    });
  }
}
