import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';

@Component({
  selector: 'app-family-deleted-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmCardImports, TranslatePipe],
  templateUrl: './family-deleted-card.html',
  styleUrl: './family-deleted-card.css',
})
export class FamilyDeletedCard {
  readonly errorCode = input('FAMILY_DELETED');
  readonly hasRemaining = input(false);
  readonly recoverWorkspace = output<void>();
  readonly goToOnboarding = output<void>();
}
