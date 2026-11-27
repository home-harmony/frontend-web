import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth';
import type { Role } from '../../../../core/context/models/rbac';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { TopControls } from '../../../../shared/components/top-controls/top-controls';
import type { MemberResponse } from '../../models/family-dto';
import type { ParsedInviteLink } from '../../models/invite-link';
import { FamilyApi } from '../../services/family-api';
import { parseInviteInput } from '../../utils/invite-link-parser';

@Component({
  selector: 'app-invite-accept',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, HlmInput, RouterLink, TopControls, TranslatePipe],
  templateUrl: './invite-accept.html',
  styleUrl: './invite-accept.css',
})
export class InviteAccept {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FamilyApi);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly manualInvite = signal<ParsedInviteLink | null>(null);
  protected readonly pasteInput = signal('');
  protected readonly parseError = signal(false);
  protected readonly displayName = signal(this.auth.user()?.name ?? '');
  protected readonly validationError = signal<TranslationKey | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly joinedMember = signal<MemberResponse | null>(null);

  protected readonly queryInvite = computed<ParsedInviteLink | null>(() => {
    const qp = this.queryParamMap();
    const familyId = qp.get('familyId')?.trim() ?? '';
    const token = qp.get('token')?.trim() ?? '';
    if (!familyId || !token) {
      return null;
    }
    return parseInviteInput(`${familyId}:${token}`);
  });

  protected readonly invite = computed<ParsedInviteLink | null>(
    () => this.manualInvite() ?? this.queryInvite(),
  );

  protected readonly hasActiveWorkspace = computed(
    () => this.workspaceStore.activeFamilyId() !== null || this.workspaceStore.families().length > 0,
  );

  protected readonly maskedToken = computed(() => {
    const token = this.invite()?.token ?? '';
    if (token.length <= 12) {
      return token;
    }
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  });

  constructor() {
    effect(() => {
      this.queryParamMap();
      this.errorMessage.set(null);
      this.validationError.set(null);
    });
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected onPasteInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.pasteInput.set(target.value);
      this.parseError.set(false);
    }
  }

  protected applyPastedInvite(event: Event): void {
    event.preventDefault();
    const parsed = parseInviteInput(this.pasteInput());
    if (!parsed) {
      this.parseError.set(true);
      return;
    }
    this.parseError.set(false);
    this.errorMessage.set(null);
    this.manualInvite.set(parsed);
  }

  protected onDisplayNameInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.displayName.set(target.value);
      this.validationError.set(null);
    }
  }

  protected async submitJoin(event: Event): Promise<void> {
    event.preventDefault();
    const target = this.invite();
    if (!target || this.submitting()) {
      return;
    }

    const trimmed = this.displayName().trim();
    if (!trimmed) {
      this.validationError.set('join.displayNameRequired');
      return;
    }
    if (trimmed.length > 80) {
      this.validationError.set('join.displayNameTooLong');
      return;
    }

    this.submitting.set(true);
    this.validationError.set(null);
    this.errorMessage.set(null);

    try {
      const member = await firstValueFrom(
        this.api.acceptInvite(target.familyId, {
          token: target.token,
          display_name: trimmed,
        }),
      );
      this.joinedMember.set(member);
      await this.workspaceStore.loadFamilies(true);
      this.workspaceStore.selectFamily(member.family_id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}
