import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import type { Permission, Role } from '../../../../core/context/models/rbac';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import type { CreateInviteRequest, InviteResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';
import { PermissionChecklist } from '../permission-checklist/permission-checklist';

type InviteableRole = Exclude<Role, 'owner'>;

interface TtlOption {
  readonly hours: number;
  readonly labelKey: TranslationKey;
}

const INVITEABLE_ROLES: readonly InviteableRole[] = ['member', 'child', 'other'];

const TTL_OPTIONS: readonly TtlOption[] = [
  { hours: 24, labelKey: 'inviteDialog.ttl24h' },
  { hours: 168, labelKey: 'inviteDialog.ttl7d' },
  { hours: 336, labelKey: 'inviteDialog.ttl14d' },
  { hours: 720, labelKey: 'inviteDialog.ttl30d' },
];

@Component({
  selector: 'app-invite-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, HlmInput, PermissionChecklist, TranslatePipe],
  templateUrl: './invite-member-dialog.html',
  styleUrl: './invite-member-dialog.css',
})
export class InviteMemberDialog {
  readonly familyId = input.required<string>();
  readonly familyName = input<string>('');
  readonly closed = output<void>();

  private readonly api = inject(FamilyApi);
  private readonly i18n = inject(I18nService);
  private readonly doc = inject(DOCUMENT);

  protected readonly inviteableRoles = INVITEABLE_ROLES;
  protected readonly ttlOptions = TTL_OPTIONS;

  protected readonly selectedRole = signal<InviteableRole>('member');
  protected readonly selectedPermissions = signal<readonly Permission[]>([]);
  protected readonly relationship = signal('');
  protected readonly ttlHours = signal<number>(168);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createdInvite = signal<InviteResponse | null>(null);
  protected readonly copiedKind = signal<'link' | 'token' | null>(null);

  protected readonly relationshipTooLong = computed(() => this.relationship().trim().length > 64);

  protected readonly roleHintKey = computed((): TranslationKey => {
    switch (this.selectedRole()) {
      case 'member':
        return 'inviteDialog.roleMemberHint';
      case 'child':
        return 'inviteDialog.roleChildHint';
      case 'other':
        return 'inviteDialog.roleOtherHint';
    }
  });

  protected readonly joinUrl = computed(() => {
    const invite = this.createdInvite();
    if (!invite) {
      return '';
    }
    const origin = this.doc.location?.origin || 'http://localhost';
    const params = new URLSearchParams({
      familyId: invite.family_id,
      token: invite.token,
    });
    return `${origin}/join?${params.toString()}`;
  });

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

  protected selectRole(role: InviteableRole): void {
    this.selectedRole.set(role);
    if (role !== 'other') {
      this.selectedPermissions.set([]);
    }
    this.errorMessage.set(null);
  }

  protected onRelationshipInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.relationship.set(target.value);
    }
  }

  protected onTtlChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      const parsed = Number.parseInt(target.value, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 720) {
        this.ttlHours.set(parsed);
      }
    }
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting() || this.relationshipTooLong()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.copiedKind.set(null);

    const role = this.selectedRole();
    const trimmedRelationship = this.relationship().trim();
    const request: CreateInviteRequest = {
      role,
      ttl_hours: this.ttlHours(),
      ...(role === 'other' ? { permissions: [...this.selectedPermissions()] } : {}),
      ...(trimmedRelationship ? { relationship: trimmedRelationship } : {}),
    };

    try {
      const invite = await firstValueFrom(this.api.createInvite(this.familyId(), request));
      this.createdInvite.set(invite);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async copyValue(value: string, kind: 'link' | 'token'): Promise<void> {
    try {
      await this.doc.defaultView?.navigator?.clipboard?.writeText(value);
      this.copiedKind.set(kind);
    } catch {
      this.copiedKind.set(null);
    }
  }

  protected resetForAnother(): void {
    this.createdInvite.set(null);
    this.copiedKind.set(null);
    this.errorMessage.set(null);
    this.relationship.set('');
    this.selectedPermissions.set([]);
  }

  protected closeDialog(): void {
    this.closed.emit();
  }
}
