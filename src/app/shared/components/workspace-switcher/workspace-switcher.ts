import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Role } from '../../../core/context/models/rbac';
import { WorkspaceStore } from '../../../core/context/stores/workspace';
import type { TranslationKey } from '../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../core/i18n/pipes/translate';

@Component({
  selector: 'app-workspace-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './workspace-switcher.html',
  styleUrl: './workspace-switcher.css',
})
export class WorkspaceSwitcher {
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
