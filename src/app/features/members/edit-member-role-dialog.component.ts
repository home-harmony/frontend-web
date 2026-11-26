import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type {
  ChangeMemberRoleRequest,
  MemberResponse,
  Permission,
  Role,
} from '../../core/api/family.dto';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PermissionChecklistComponent } from '../../shared/components/permission-checklist.component';

type EditableRole = Exclude<Role, 'owner'>;

const EDITABLE_ROLES: readonly EditableRole[] = ['member', 'child', 'other'];

function samePermissionSet(a: readonly Permission[], b: readonly Permission[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setA = new Set(a);
  return b.every((perm) => setA.has(perm));
}

@Component({
  selector: 'app-edit-member-role-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmBadge,
    HlmButton,
    HlmCardImports,
    PermissionChecklistComponent,
    TranslatePipe,
  ],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabindex="-1"
        class="fixed inset-0 bg-background/80 backdrop-blur-xs"
        [attr.aria-label]="'editRoleDialog.close' | t"
        (click)="onBackdropClose()"
      ></button>
      <section
        hlmCard
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-role-dialog-title"
        class="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card p-6 shadow-lg space-y-5"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="edit-role-dialog-title" class="text-base font-semibold tracking-tight">
                {{ 'editRoleDialog.title' | t }}
              </h2>
              <span hlmBadge variant="outline">{{ member().display_name }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ 'editRoleDialog.subtitle' | t }}
              <span class="font-medium text-foreground">{{ member().display_name }}</span>
              ({{ roleKey(member().role) | t }})
            </p>
          </div>
          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="sm"
            [attr.aria-label]="'editRoleDialog.close' | t"
            (click)="closeDialog()"
          >
            ✕
          </button>
        </div>

        @if (errorMessage(); as message) {
          <div
            role="alert"
            class="border border-destructive bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          >
            {{ message }}
          </div>
        }

        <form class="space-y-4" (submit)="submit($event)">
          <div class="space-y-2">
            <span class="text-xs font-medium">{{ 'editRoleDialog.roleLabel' | t }}</span>
            <div class="grid grid-cols-3 gap-2" role="radiogroup">
              @for (role of editableRoles; track role) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="selectedRole() === role"
                  class="border px-3 py-2 text-xs font-medium transition-colors text-center"
                  [class.border-primary]="selectedRole() === role"
                  [class.bg-primary]="selectedRole() === role"
                  [class.text-primary-foreground]="selectedRole() === role"
                  [class.border-border]="selectedRole() !== role"
                  [class.bg-background]="selectedRole() !== role"
                  [disabled]="submitting()"
                  (click)="selectRole(role)"
                >
                  {{ roleKey(role) | t }}
                </button>
              }
            </div>
            <p
              class="border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed"
            >
              {{ roleHintKey() | t }}
            </p>
          </div>

          @if (selectedRole() === 'other') {
            <app-permission-checklist
              [legend]="'editRoleDialog.permissionsLegend' | t"
              [disabled]="submitting()"
              [(selected)]="selectedPermissions"
            />
          }

          @if (!hasChanges()) {
            <p class="text-xs text-muted-foreground">{{ 'editRoleDialog.noChangesHint' | t }}</p>
          }

          <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              hlmBtn
              type="button"
              variant="outline"
              [disabled]="submitting()"
              (click)="closeDialog()"
            >
              {{ 'editRoleDialog.cancel' | t }}
            </button>
            <button hlmBtn type="submit" [disabled]="!hasChanges() || submitting()">
              {{
                submitting()
                  ? ('editRoleDialog.submitting' | t)
                  : ('editRoleDialog.submit' | t)
              }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class EditMemberRoleDialogComponent {
  readonly familyId = input.required<string>();
  readonly member = input.required<MemberResponse>();
  readonly closed = output<void>();
  readonly updated = output<MemberResponse>();

  private readonly api = inject(FamilyApiClient);
  private readonly i18n = inject(I18nService);

  protected readonly editableRoles = EDITABLE_ROLES;

  protected readonly selectedRole = signal<EditableRole>('member');
  protected readonly selectedPermissions = signal<readonly Permission[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly hasChanges = computed(() => {
    const current = this.member();
    const targetRole = this.selectedRole();
    if (targetRole !== current.role) {
      return true;
    }
    if (targetRole === 'other') {
      return !samePermissionSet(current.permissions, this.selectedPermissions());
    }
    return false;
  });

  protected readonly roleHintKey = computed((): TranslationKey => {
    switch (this.selectedRole()) {
      case 'member':
        return 'editRoleDialog.memberHint';
      case 'child':
        return 'editRoleDialog.childHint';
      case 'other':
        return 'editRoleDialog.otherHint';
    }
  });

  constructor() {
    effect(() => {
      const target = this.member();
      this.selectedRole.set(target.role === 'owner' ? 'member' : target.role);
      this.selectedPermissions.set(target.role === 'other' ? [...target.permissions] : []);
      this.errorMessage.set(null);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.submitting()) {
      this.closeDialog();
    }
  }

  protected onBackdropClose(): void {
    if (!this.submitting()) {
      this.closeDialog();
    }
  }

  protected selectRole(role: EditableRole): void {
    this.selectedRole.set(role);
    if (role !== 'other') {
      this.selectedPermissions.set([]);
    }
    this.errorMessage.set(null);
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.hasChanges() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const role = this.selectedRole();
    const request: ChangeMemberRoleRequest =
      role === 'other' ? { role, permissions: [...this.selectedPermissions()] } : { role };

    try {
      const updatedMember = await firstValueFrom(
        this.api.changeMemberRole(this.familyId(), this.member().id, request),
      );
      this.updated.emit(updatedMember);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected closeDialog(): void {
    this.closed.emit();
  }
}
