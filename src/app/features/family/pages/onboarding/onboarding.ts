import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { AuthService } from '../../../../core/auth/services/auth';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { TopControls } from '../../../../shared/components/top-controls/top-controls';
import { parseInviteInput } from '../../utils/invite-link-parser';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, HlmInput, TopControls, TranslatePipe],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding {
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
