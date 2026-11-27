import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { firstValueFrom } from 'rxjs';
import type { Role } from '../../../../core/context/models/rbac';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { FamilyDeletedCard } from '../../components/family-deleted-card/family-deleted-card';
import { InviteMemberDialog } from '../../components/invite-member-dialog/invite-member-dialog';
import type { FamilyResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';
import { isFamilyEvictionError } from '../../utils/family-eviction';

@Component({
  selector: 'app-workspace-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FamilyDeletedCard,
    HlmBadge,
    HlmButton,
    HlmCardImports,
    InviteMemberDialog,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './workspace-overview.html',
  styleUrl: './workspace-overview.css',
})
export class WorkspaceOverview {
  protected readonly workspaceStore = inject(WorkspaceStore);
  private readonly api = inject(FamilyApi);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private requestCounter = 0;
  private skipSwitchVersion: number | null = null;

  protected readonly family = signal<FamilyResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly evictedCode = signal<string | null>(null);
  protected readonly hasRemainingWorkspace = signal(false);
  protected readonly inviteDialogOpen = signal(false);
  protected readonly isOwner = computed(() => this.workspaceStore.activeRole() === 'owner');

  protected readonly displayName = computed(
    () => this.family()?.name ?? this.workspaceStore.activeWorkspace()?.family.name ?? '',
  );
  protected readonly displayCurrency = computed(
    () =>
      this.family()?.home_currency ??
      this.workspaceStore.activeWorkspace()?.family.home_currency ??
      '',
  );
  protected readonly createdDate = computed(() => {
    const raw = this.family()?.created_at;
    return raw ? raw.slice(0, 10) : null;
  });

  protected readonly roadmapModules = computed(
    (): { readonly labelKey: TranslationKey; readonly sprint: string; readonly visible: boolean }[] => {
      const role = this.workspaceStore.activeRole();
      return [
        { labelKey: 'shell.nav.accounts', sprint: 'S3', visible: true },
        { labelKey: 'shell.nav.ledger', sprint: 'S3', visible: true },
        {
          labelKey: 'shell.nav.debt',
          sprint: 'S4',
          visible: role !== 'child',
        },
        { labelKey: 'shell.nav.budget', sprint: 'S5', visible: true },
      ];
    },
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
      if (familyId) {
        void this.loadFamily(familyId);
      }
    });
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected roleDescriptionKey(role: Role): TranslationKey {
    return `roles.description.${role}` as const;
  }

  protected recoverToRemaining(): void {
    this.evictedCode.set(null);
    this.skipSwitchVersion = null;
    const nextId = this.workspaceStore.activeFamilyId();
    if (nextId) {
      void this.loadFamily(nextId);
    }
  }

  protected goToOnboarding(): void {
    void this.router.navigate(['/onboarding']);
  }

  private async loadFamily(familyId: string): Promise<void> {
    const seq = ++this.requestCounter;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.evictedCode.set(null);
    this.family.set(null);

    try {
      const loaded = await firstValueFrom(this.api.getFamily(familyId));
      if (seq !== this.requestCounter) {
        return;
      }
      this.family.set(loaded);
      this.workspaceStore.applyFamilyProfileUpdate(loaded);
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
