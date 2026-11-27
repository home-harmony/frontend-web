import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ALL_PERMISSIONS, type Permission } from '../../../../core/context/models/rbac';
import type { TranslationKey } from '../../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';

@Component({
  selector: 'app-permission-checklist',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-checklist.html',
  styleUrl: './permission-checklist.css',
})
export class PermissionChecklist {
  readonly legend = input<string>('Permissions');
  readonly disabled = input<boolean>(false);
  readonly selected = model<readonly Permission[]>([]);

  protected readonly allPermissions = ALL_PERMISSIONS;

  protected isSelected(permission: Permission): boolean {
    return this.selected().includes(permission);
  }

  protected toggle(permission: Permission): void {
    if (this.disabled()) {
      return;
    }

    const current = this.selected();
    if (current.includes(permission)) {
      this.selected.set(current.filter((item) => item !== permission));
    } else {
      this.selected.set([...current, permission]);
    }
  }

  protected permissionKey(permission: Permission): TranslationKey {
    return `permissions.${permission}` as const;
  }
}
