import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/auth/services/auth';
import type { Role } from '../../../core/context/models/rbac';
import { WorkspaceStore } from '../../../core/context/stores/workspace';
import type { TranslationKey } from '../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../core/i18n/pipes/translate';
import { TopControls } from '../top-controls/top-controls';
import { WorkspaceSwitcher } from '../workspace-switcher/workspace-switcher';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmBadge,
    HlmButton,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TopControls,
    TranslatePipe,
    WorkspaceSwitcher,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly workspaceStore = inject(WorkspaceStore);

  protected readonly drawerOpen = signal(false);
  protected readonly switchBannerVisible = signal(false);

  protected readonly showDebtPlaceholder = computed(() => {
    const role = this.workspaceStore.activeRole();
    return role === 'owner' || role === 'member';
  });

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected onWorkspaceSwitched(): void {
    this.drawerOpen.set(false);
    this.switchBannerVisible.set(true);
  }
}
