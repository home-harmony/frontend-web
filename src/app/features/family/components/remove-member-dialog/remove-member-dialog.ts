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
import type { Role } from '../../../../core/context/models/rbac';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import type { MemberResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';

@Component({
  selector: 'app-remove-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, TranslatePipe],
  templateUrl: './remove-member-dialog.html',
  styleUrl: './remove-member-dialog.css',
})
export class RemoveMemberDialog {
  readonly familyId = input.required<string>();
  readonly member = input.required<MemberResponse>();
  readonly closed = output<void>();
  readonly removed = output<string>();

  private readonly api = inject(FamilyApi);
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
