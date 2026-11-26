import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Role } from '../../core/api/family.dto';
import { WorkspaceStore } from '../../core/context/workspace.store';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-workspace-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="space-y-1 relative">
      <div class="text-xs text-muted-foreground">{{ 'shell.activeWorkspace' | t }}</div>

      @if (store.activeWorkspace(); as current) {
        <button
          type="button"
          class="w-full border border-input bg-background text-foreground px-2.5 py-2 text-xs flex items-center justify-between gap-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          [attr.aria-expanded]="open()"
          (click)="toggle()"
        >
          <div class="min-w-0">
            <div class="font-semibold truncate">{{ current.family.name }}</div>
            <div class="text-xs text-muted-foreground truncate">
              {{ current.family.home_currency }} · {{ roleKey(current.membership.role) | t }}
            </div>
          </div>
          <span class="text-muted-foreground shrink-0">▾</span>
        </button>
      }

      @if (open()) {
        <div
          class="absolute z-30 left-0 right-0 mt-1 p-1.5 space-y-1 border border-border bg-popover text-popover-foreground shadow-md"
        >
          @for (item of store.families(); track item.family.id) {
            <button
              type="button"
              class="w-full text-left px-2.5 py-2 text-xs flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground"
              [class.bg-accent]="item.family.id === store.activeFamilyId()"
              [attr.data-workspace-id]="item.family.id"
              (click)="selectWorkspace(item.family.id)"
            >
              <div class="min-w-0">
                <div class="font-medium truncate">{{ item.family.name }}</div>
                <div class="text-xs text-muted-foreground truncate">
                  {{ item.family.home_currency }} · {{ roleKey(item.membership.role) | t }}
                </div>
              </div>
              @if (item.family.id === store.activeFamilyId()) {
                <span class="shrink-0">✓</span>
              }
            </button>
          }

          <div class="pt-1 mt-1 border-t border-border">
            <button
              type="button"
              class="w-full text-left px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-accent"
              (click)="navigateToCreate()"
            >
              {{ 'shell.createWorkspaceOption' | t }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class WorkspaceSwitcherComponent {
  protected readonly store = inject(WorkspaceStore);
  private readonly router = inject(Router);

  readonly workspaceSwitched = output<string>();
  protected readonly open = signal(false);

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected selectWorkspace(familyId: string): void {
    const previousId = this.store.activeFamilyId();
    const switched = this.store.selectFamily(familyId);
    this.open.set(false);
    if (switched && previousId !== familyId) {
      this.workspaceSwitched.emit(familyId);
    }
  }

  protected navigateToCreate(): void {
    this.open.set(false);
    void this.router.navigate(['/onboarding/create']);
  }
}
