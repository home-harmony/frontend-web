import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import type { Role } from '../../core/api/family.dto';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceStore } from '../../core/context/workspace.store';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TopControlsComponent } from './top-controls.component';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmBadge,
    HlmButton,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TopControlsComponent,
    TranslatePipe,
    WorkspaceSwitcherComponent,
  ],
  template: `
    <div class="min-h-screen flex bg-background text-foreground relative">
      <!-- Desktop Sidebar -->
      <aside
        class="hidden md:flex md:flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <div class="p-3.5 flex flex-col justify-between h-full gap-4">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="w-6 h-6 inline-flex items-center justify-center text-xs font-bold bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  F
                </span>
                <span class="text-sm font-semibold tracking-tight">{{ 'app.name' | t }}</span>
              </div>
              @if (workspaceStore.activeWorkspace(); as active) {
                <span hlmBadge variant="outline" class="font-mono">
                  {{ active.family.home_currency }}
                </span>
              }
            </div>

            <app-workspace-switcher (workspaceSwitched)="onWorkspaceSwitched()" />

            <nav class="space-y-1 text-xs">
              <a
                routerLink="/workspace"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary font-medium"
                [routerLinkActiveOptions]="{ exact: true }"
                class="block px-2.5 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {{ 'shell.nav.overview' | t }}
              </a>
              <div class="px-2.5 py-2 flex items-center justify-between text-muted-foreground">
                <span>{{ 'shell.nav.members' | t }}</span>
                <span hlmBadge variant="outline" class="font-mono">S5</span>
              </div>
              <div class="px-2.5 py-2 flex items-center justify-between text-muted-foreground">
                <span>{{ 'shell.nav.settings' | t }}</span>
                <span hlmBadge variant="outline" class="font-mono">S3</span>
              </div>
            </nav>

            <div class="pt-2 border-t border-sidebar-border space-y-1 text-xs text-muted-foreground">
              <div class="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider opacity-75">
                {{ 'shell.nav.upcoming' | t }}
              </div>
              <div class="px-2.5 py-1.5 opacity-65">{{ 'shell.nav.accounts' | t }}</div>
              <div class="px-2.5 py-1.5 opacity-65">{{ 'shell.nav.ledger' | t }}</div>
              @if (showDebtPlaceholder()) {
                <div class="px-2.5 py-1.5 opacity-65">{{ 'shell.nav.debt' | t }}</div>
              }
              <div class="px-2.5 py-1.5 opacity-65">{{ 'shell.nav.budget' | t }}</div>
            </div>
          </div>

          @if (workspaceStore.activeWorkspace(); as active) {
            <div
              class="pt-3 border-t border-sidebar-border flex items-center justify-between gap-2 text-xs"
            >
              <div class="min-w-0">
                <div class="font-medium truncate">{{ active.membership.display_name }}</div>
                @if (auth.user(); as user) {
                  <div class="text-muted-foreground truncate">{{ user.email }}</div>
                }
              </div>
              <span hlmBadge class="shrink-0">{{ roleKey(active.membership.role) | t }}</span>
            </div>
          }
        </div>
      </aside>

      <!-- Mobile Drawer Backdrop -->
      @if (drawerOpen()) {
        <div
          class="fixed inset-0 z-40 bg-black/40 flex md:hidden"
          role="presentation"
          (click)="closeDrawerOnBackdrop($event)"
        >
          <aside
            class="w-72 max-w-[85%] h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl p-3.5 flex flex-col justify-between gap-4"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="w-6 h-6 inline-flex items-center justify-center text-xs font-bold bg-sidebar-primary text-sidebar-primary-foreground"
                  >
                    F
                  </span>
                  <span class="text-sm font-semibold tracking-tight">{{ 'app.name' | t }}</span>
                </div>
                <button hlmBtn type="button" variant="outline" size="xs" (click)="drawerOpen.set(false)">
                  ✕
                </button>
              </div>

              <app-workspace-switcher (workspaceSwitched)="onWorkspaceSwitched()" />

              <nav class="space-y-1 text-xs">
                <a
                  routerLink="/workspace"
                  routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary font-medium"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="block px-2.5 py-2"
                  (click)="drawerOpen.set(false)"
                >
                  {{ 'shell.nav.overview' | t }}
                </a>
                <div class="px-2.5 py-2 flex items-center justify-between text-muted-foreground">
                  <span>{{ 'shell.nav.members' | t }}</span>
                  <span hlmBadge variant="outline" class="font-mono">S5</span>
                </div>
                <div class="px-2.5 py-2 flex items-center justify-between text-muted-foreground">
                  <span>{{ 'shell.nav.settings' | t }}</span>
                  <span hlmBadge variant="outline" class="font-mono">S3</span>
                </div>
              </nav>
            </div>
          </aside>
        </div>
      }

      <!-- Main Column -->
      <div class="flex-1 flex flex-col min-w-0">
        <header
          class="border-b border-border bg-card text-card-foreground px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <button
              hlmBtn
              type="button"
              variant="outline"
              size="sm"
              class="md:hidden"
              [attr.aria-label]="'shell.openMenu' | t"
              (click)="drawerOpen.set(true)"
            >
              ☰
            </button>
            <div class="text-xs text-muted-foreground truncate">
              {{ 'shell.workspaces' | t }} /
              <strong class="text-foreground">
                {{ workspaceStore.activeWorkspace()?.family?.name ?? '' }}
              </strong>
            </div>
          </div>

          <app-top-controls />
        </header>

        <main class="flex-1 p-4 md:p-6 space-y-4">
          @if (switchBannerVisible()) {
            <div
              class="border border-border bg-accent text-accent-foreground px-3 py-2 text-xs flex items-center justify-between gap-2"
            >
              <span>{{ 'shell.switchSuccess' | t }}</span>
              <button
                type="button"
                class="font-medium underline shrink-0"
                (click)="switchBannerVisible.set(false)"
              >
                {{ 'shell.dismiss' | t }}
              </button>
            </div>
          }

          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
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

  protected closeDrawerOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.drawerOpen.set(false);
    }
  }
}
