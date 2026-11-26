import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { Role } from '../../core/api/family.dto';
import { WorkspaceStore } from '../../core/context/workspace.store';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-workspace-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCardImports, TranslatePipe],
  template: `
    <div class="space-y-4">
      <div class="space-y-1">
        <h1 class="text-lg font-semibold tracking-tight">{{ 'overview.title' | t }}</h1>
        <p class="text-xs text-muted-foreground">{{ 'overview.subtitle' | t }}</p>
      </div>

      @if (workspaceStore.activeWorkspace(); as active) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <section hlmCard class="p-3.5 space-y-1">
            <div class="text-xs text-muted-foreground">{{ 'overview.card.workspaceId' | t }}</div>
            <div class="text-xs font-mono font-semibold break-all">{{ active.family.id }}</div>
          </section>

          <section hlmCard class="p-3.5 space-y-1">
            <div class="text-xs text-muted-foreground">{{ 'overview.card.currency' | t }}</div>
            <div class="text-lg font-semibold font-mono">{{ active.family.home_currency }}</div>
          </section>

          <section hlmCard class="p-3.5 space-y-1">
            <div class="text-xs text-muted-foreground">{{ 'overview.card.role' | t }}</div>
            <div class="text-sm font-semibold">
              {{ roleKey(active.membership.role) | t }} · {{ active.membership.display_name }}
            </div>
          </section>
        </div>
      }

      <section hlmCard class="p-4 text-xs text-muted-foreground">
        {{ 'overview.nextSliceNote' | t }}
      </section>
    </div>
  `,
})
export class WorkspaceOverviewComponent {
  protected readonly workspaceStore = inject(WorkspaceStore);

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }
}
