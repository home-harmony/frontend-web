import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ApiHttpError } from '../../core/http/api-http-error';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export function isFamilyEvictionError(err: unknown): boolean {
  return (
    err instanceof ApiHttpError &&
    (err.code === 'FAMILY_DELETED' || err.code === 'USER_NOT_IN_FAMILY')
  );
}

@Component({
  selector: 'app-family-deleted-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmCardImports, TranslatePipe],
  template: `
    <section hlmCard class="max-w-lg p-6 space-y-4">
      <div class="border border-destructive bg-card text-destructive px-3 py-2 text-xs font-mono">
        {{ errorCode() }}
      </div>
      <div class="space-y-1">
        <h2 class="text-base font-semibold tracking-tight">{{ 'familyDeleted.title' | t }}</h2>
        <p class="text-xs text-muted-foreground leading-relaxed">
          {{ 'familyDeleted.subtitle' | t }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        @if (hasRemaining()) {
          <button hlmBtn type="button" (click)="recoverWorkspace.emit()">
            {{ 'familyDeleted.switchRemaining' | t }}
          </button>
        }
        <button
          hlmBtn
          type="button"
          [variant]="hasRemaining() ? 'outline' : 'default'"
          (click)="goToOnboarding.emit()"
        >
          {{ 'familyDeleted.goOnboarding' | t }}
        </button>
      </div>
    </section>
  `,
})
export class FamilyDeletedCardComponent {
  readonly errorCode = input('FAMILY_DELETED');
  readonly hasRemaining = input(false);
  readonly recoverWorkspace = output<void>();
  readonly goToOnboarding = output<void>();
}
