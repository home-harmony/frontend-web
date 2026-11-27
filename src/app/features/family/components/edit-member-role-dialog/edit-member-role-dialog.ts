import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import type { Permission, Role } from '../../../../core/context/models/rbac';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import type { ChangeMemberRoleRequest, MemberResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';
import { PermissionChecklist } from '../permission-checklist/permission-checklist';

type EditableRole = Exclude<Role, 'owner'>;

const EDITABLE_ROLES: readonly EditableRole[] = ['member', 'child', 'other'];

function samePermissionSet(a: readonly Permission[], b: readonly Permission[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setA = new Set(a);
  return b.every((perm) => setA.has(perm));
}

@Component({
  selector: 'app-edit-member-role-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, PermissionChecklist, TranslatePipe],
  templateUrl: './edit-member-role-dialog.html',
  styleUrl: './edit-member-role-dialog.css',
})
export class EditMemberRoleDialog {
  readonly familyId = input.required<string>();
  readonly member = input.required<MemberResponse>();
  readonly closed = output<void>();
  readonly updated = output<MemberResponse>();

  private readonly api = inject(FamilyApi);
  private readonly i18n = inject(I18nService);

  protected readonly editableRoles = EDITABLE_ROLES;

  protected readonly selectedRole = signal<EditableRole>('member');
  protected readonly selectedPermissions = signal<readonly Permission[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly hasChanges = computed(() => {
    const current = this.member();
    const targetRole = this.selectedRole();
    if (targetRole !== current.role) {
      return true;
    }
    if (targetRole === 'other') {
      return !samePermissionSet(current.permissions, this.selectedPermissions());
    }
    return false;
  });

  protected readonly roleHintKey = computed((): TranslationKey => {
    switch (this.selectedRole()) {
      case 'member':
        return 'editRoleDialog.memberHint';
      case 'child':
        return 'editRoleDialog.childHint';
      case 'other':
        return 'editRoleDialog.otherHint';
    }
  });

  constructor() {
    effect(() => {
      const target = this.member();
      this.selectedRole.set(target.role === 'owner' ? 'member' : target.role);
      this.selectedPermissions.set(target.role === 'other' ? [...target.permissions] : []);
      this.errorMessage.set(null);
    });
  }

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

  protected selectRole(role: EditableRole): void {
    this.selectedRole.set(role);
    if (role !== 'other') {
      this.selectedPermissions.set([]);
    }
    this.errorMessage.set(null);
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.hasChanges() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const role = this.selectedRole();
    const request: ChangeMemberRoleRequest =
      role === 'other' ? { role, permissions: [...this.selectedPermissions()] } : { role };

    try {
      const updatedMember = await firstValueFrom(
        this.api.changeMemberRole(this.familyId(), this.member().id, request),
      );
      this.updated.emit(updatedMember);
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
