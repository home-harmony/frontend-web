import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ALL_PERMISSIONS, type Permission } from '../../core/api/family.dto';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-permission-checklist',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="space-y-2 border border-border bg-muted/20 p-3">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {{ legend() }}
      </legend>
      <div class="grid gap-2 sm:grid-cols-2">
        @for (perm of allPermissions; track perm) {
          <label
            class="flex cursor-pointer items-start gap-2.5 border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
            [class.opacity-60]="disabled()"
          >
            <input
              type="checkbox"
              class="mt-0.5 size-4 accent-primary"
              [checked]="isSelected(perm)"
              [disabled]="disabled()"
              (change)="toggle(perm)"
            />
            <span class="leading-snug text-foreground">{{ permissionKey(perm) | t }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class PermissionChecklistComponent {
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
