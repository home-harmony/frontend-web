import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type { MemberResponse, Role } from '../../core/api/family.dto';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-remove-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabindex="-1"
        class="fixed inset-0 bg-background/80 backdrop-blur-xs"
        [attr.aria-label]="'removeMemberDialog.close' | t"
        (click)="onBackdropClose()"
      ></button>
      <section
        hlmCard
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-member-dialog-title"
        class="relative z-10 w-full max-w-md bg-card p-6 shadow-lg space-y-4"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border pb-3">
          <h2 id="remove-member-dialog-title" class="text-base font-semibold tracking-tight">
            {{ 'removeMemberDialog.title' | t }}
          </h2>
          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="sm"
            [attr.aria-label]="'removeMemberDialog.close' | t"
            (click)="closeDialog()"
          >
            ✕
          </button>
        </div>

        @if (errorMessage(); as message) {
          <div
            role="alert"
            class="border border-destructive bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            {{ message }}
          </div>
        }

        <div class="border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
          <div class="text-muted-foreground">{{ 'removeMemberDialog.targetLabel' | t }}</div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-foreground">{{ member().display_name }}</span>
            <span hlmBadge>{{ roleKey(member().role) | t }}</span>
          </div>
          <div class="text-muted-foreground">
            {{ member().relationship || '—' }} · {{ joinedDate() }}
          </div>
        </div>

        <p class="text-xs text-muted-foreground leading-relaxed">
          {{ 'removeMemberDialog.warning' | t }}
        </p>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            hlmBtn
            type="button"
            variant="outline"
            [disabled]="submitting()"
            (click)="closeDialog()"
          >
            {{ 'removeMemberDialog.cancel' | t }}
          </button>
          <button
            hlmBtn
            type="button"
            variant="destructive"
            [disabled]="submitting()"
            (click)="confirmRemove()"
          >
            {{
              submitting()
                ? ('removeMemberDialog.removing' | t)
                : ('removeMemberDialog.confirm' | t)
            }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class RemoveMemberDialogComponent {
  readonly familyId = input.required<string>();
  readonly member = input.required<MemberResponse>();
  readonly closed = output<void>();
  readonly removed = output<string>();

  private readonly api = inject(FamilyApiClient);
  private readonly i18n = inject(I18nService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.submitting()) {
      this.closeDialog();
    }
  }

  protected onBackdropClose(): void {
    if (!this.submitting()) {
      this.closeDialog();
    }
  }

  protected joinedDate(): string {
    return this.member().joined_at.slice(0, 10);
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected async confirmRemove(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const memberId = this.member().id;

    try {
      await firstValueFrom(this.api.removeMember(this.familyId(), memberId));
      this.removed.emit(memberId);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected closeDialog(): void {
    this.closed.emit();
  }
}
