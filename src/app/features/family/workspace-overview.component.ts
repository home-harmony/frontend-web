import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type { FamilyResponse, Role } from '../../core/api/family.dto';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FamilyDeletedCardComponent, isFamilyEvictionError } from './family-deleted-card.component';

@Component({
  selector: 'app-workspace-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FamilyDeletedCardComponent,
    HlmBadge,
    HlmButton,
    HlmCardImports,
    RouterLink,
    TranslatePipe,
  ],
  template: `
    @if (evictedCode(); as code) {
      <app-family-deleted-card
        [errorCode]="code"
        [hasRemaining]="hasRemainingWorkspace()"
        (recoverWorkspace)="recoverToRemaining()"
        (goToOnboarding)="goToOnboarding()"
      />
    } @else {
      <div class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-semibold tracking-tight">{{ displayName() }}</h1>
              @if (displayCurrency(); as currency) {
                <span hlmBadge variant="outline" class="font-mono">{{ currency }}</span>
              }
            </div>
            @if (createdDate(); as created) {
              <p class="text-xs text-muted-foreground">
                {{ 'overview.createdLabel' | t }}: <span class="font-mono">{{ created }}</span>
              </p>
            } @else {
              <p class="text-xs text-muted-foreground">{{ 'overview.subtitle' | t }}</p>
            }
          </div>

          <a hlmBtn variant="outline" size="sm" routerLink="/workspace/settings">
            {{ 'overview.manageSettings' | t }}
          </a>
        </div>

        @if (errorMessage(); as message) {
          <div
            role="alert"
            class="border border-destructive bg-card text-destructive px-3 py-2.5 text-xs"
          >
            {{ message }}
          </div>
        }

        @if (loading() && !family()) {
          <p class="text-xs text-muted-foreground">{{ 'common.loading' | t }}</p>
        }

        @if (workspaceStore.activeWorkspace(); as active) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <section hlmCard class="p-4 space-y-1.5">
              <div class="text-xs text-muted-foreground">{{ 'overview.card.currency' | t }}</div>
              <div class="text-xl font-semibold font-mono">{{ displayCurrency() }}</div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ 'overview.currencyNote' | t }}
              </p>
            </section>

            <section hlmCard class="p-4 space-y-1.5">
              <div class="text-xs text-muted-foreground">{{ 'overview.accessCard' | t }}</div>
              <div class="flex items-center gap-2">
                <span hlmBadge>{{ roleKey(active.membership.role) | t }}</span>
                <span class="text-xs font-medium">{{ active.membership.display_name }}</span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ roleDescriptionKey(active.membership.role) | t }}
              </p>
            </section>

            <section hlmCard class="p-4 space-y-1.5">
              <div class="text-xs text-muted-foreground">{{ 'overview.card.workspaceId' | t }}</div>
              <div class="text-xs font-mono font-semibold break-all">{{ active.family.id }}</div>
              @if (createdDate(); as created) {
                <div class="text-xs text-muted-foreground pt-1">
                  {{ 'overview.createdLabel' | t }}: <span class="font-mono">{{ created }}</span>
                </div>
              }
            </section>
          </div>
        }

        <section hlmCard class="p-4 space-y-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {{ 'overview.roadmapTitle' | t }}
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">{{ 'overview.roadmapSubtitle' | t }}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            @for (mod of roadmapModules(); track mod.labelKey) {
              <div
                class="border border-border p-2.5 text-xs flex items-center justify-between gap-2"
                [class.opacity-45]="!mod.visible"
              >
                <span>{{ mod.labelKey | t }}</span>
                <span hlmBadge variant="outline" class="font-mono">
                  {{ mod.visible ? mod.sprint : ('overview.hiddenChild' | t) }}
                </span>
              </div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class WorkspaceOverviewComponent {
  protected readonly workspaceStore = inject(WorkspaceStore);
  private readonly api = inject(FamilyApiClient);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private requestCounter = 0;
  private skipSwitchVersion: number | null = null;

  protected readonly family = signal<FamilyResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly evictedCode = signal<string | null>(null);
  protected readonly hasRemainingWorkspace = signal(false);

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
