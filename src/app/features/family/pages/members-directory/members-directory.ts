import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { firstValueFrom } from 'rxjs';
import type { Permission, Role } from '../../../../core/context/models/rbac';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { EditMemberRoleDialog } from '../../components/edit-member-role-dialog/edit-member-role-dialog';
import { FamilyDeletedCard } from '../../components/family-deleted-card/family-deleted-card';
import { InviteMemberDialog } from '../../components/invite-member-dialog/invite-member-dialog';
import { RemoveMemberDialog } from '../../components/remove-member-dialog/remove-member-dialog';
import type { MemberResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';
import { isFamilyEvictionError } from '../../utils/family-eviction';

@Component({
  selector: 'app-members-directory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EditMemberRoleDialog,
    FamilyDeletedCard,
    HlmBadge,
    HlmButton,
    HlmCardImports,
    HlmTableImports,
    InviteMemberDialog,
    RemoveMemberDialog,
    TranslatePipe,
  ],
  templateUrl: './members-directory.html',
  styleUrl: './members-directory.css',
})
export class MembersDirectory {
  protected readonly workspaceStore = inject(WorkspaceStore);
  private readonly api = inject(FamilyApi);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private requestCounter = 0;
  private skipSwitchVersion: number | null = null;

  protected readonly members = signal<readonly MemberResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly evictedCode = signal<string | null>(null);
  protected readonly hasRemainingWorkspace = signal(false);
  protected readonly inviteDialogOpen = signal(false);
  protected readonly editingMember = signal<MemberResponse | null>(null);
  protected readonly removingMember = signal<MemberResponse | null>(null);

  protected readonly isOwner = computed(() => this.workspaceStore.activeRole() === 'owner');
  protected readonly familyName = computed(
    () => this.workspaceStore.activeWorkspace()?.family.name ?? '',
  );

  constructor() {
    effect(() => {
      const familyId = this.workspaceStore.activeFamilyId();
      const switchVer = this.workspaceStore.switchVersion();
      if (this.skipSwitchVersion !== null && this.skipSwitchVersion === switchVer) {
        return;
      }
      this.skipSwitchVersion = null;
      this.inviteDialogOpen.set(false);
      this.editingMember.set(null);
      this.removingMember.set(null);
      if (familyId) {
        void this.loadMembers(familyId);
      }
    });
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected presetKey(role: Role): TranslationKey {
    switch (role) {
      case 'owner':
        return 'members.presetOwner';
      case 'member':
        return 'members.presetMember';
      case 'child':
      case 'other':
        return 'members.presetChild';
    }
  }

  protected permissionKey(permission: Permission): TranslationKey {
    return `permissions.${permission}` as const;
  }

  protected joinedDate(raw: string): string {
    return raw.slice(0, 10);
  }

  protected onMemberUpdated(updated: MemberResponse): void {
    this.members.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    this.editingMember.set(null);
  }

  protected onMemberRemoved(memberId: string): void {
    this.members.update((list) => list.filter((item) => item.id !== memberId));
    this.removingMember.set(null);
    const activeFamilyId = this.workspaceStore.activeFamilyId();
    if (activeFamilyId) {
      void this.loadMembers(activeFamilyId);
    }
  }

  protected recoverToRemaining(): void {
    this.evictedCode.set(null);
    this.skipSwitchVersion = null;
    const nextId = this.workspaceStore.activeFamilyId();
    if (nextId) {
      void this.loadMembers(nextId);
    }
  }

  protected goToOnboarding(): void {
    void this.router.navigate(['/onboarding']);
  }

  private async loadMembers(familyId: string): Promise<void> {
    const seq = ++this.requestCounter;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.evictedCode.set(null);
    this.members.set([]);

    try {
      const response = await firstValueFrom(this.api.listMembers(familyId));
      if (seq !== this.requestCounter) {
        return;
      }
      this.members.set(response.items);
    } catch (err: unknown) {
      if (seq !== this.requestCounter) {
        return;
      }
      if (isFamilyEvictionError(err)) {
        const remainingId = this.workspaceStore.evictFamily(familyId);
        this.skipSwitchVersion = this.workspaceStore.switchVersion();
        this.hasRemainingWorkspace.set(remainingId !== null);
        this.evictedCode.set(err instanceof ApiHttpError ? err.code : 'FAMILY_DELETED');
        return;
      }
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      if (seq === this.requestCounter) {
        this.loading.set(false);
      }
    }
  }
}
