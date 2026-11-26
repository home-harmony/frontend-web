import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type {
  CreateInviteRequest,
  InviteResponse,
  Permission,
  Role,
} from '../../core/api/family.dto';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PermissionChecklistComponent } from '../../shared/components/permission-checklist.component';

type InviteableRole = Exclude<Role, 'owner'>;

interface TtlOption {
  readonly hours: number;
  readonly labelKey: TranslationKey;
}

const INVITEABLE_ROLES: readonly InviteableRole[] = ['member', 'child', 'other'];

const TTL_OPTIONS: readonly TtlOption[] = [
  { hours: 24, labelKey: 'inviteDialog.ttl24h' },
  { hours: 168, labelKey: 'inviteDialog.ttl7d' },
  { hours: 336, labelKey: 'inviteDialog.ttl14d' },
  { hours: 720, labelKey: 'inviteDialog.ttl30d' },
];

@Component({
  selector: 'app-invite-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmBadge,
    HlmButton,
    HlmCardImports,
    HlmInput,
    PermissionChecklistComponent,
    TranslatePipe,
  ],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabindex="-1"
        class="fixed inset-0 bg-background/80 backdrop-blur-xs"
        [attr.aria-label]="'inviteDialog.close' | t"
        (click)="onBackdropClose()"
      ></button>
      <section
        hlmCard
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
        class="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card p-6 shadow-lg space-y-5"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="invite-dialog-title" class="text-base font-semibold tracking-tight">
                {{ 'inviteDialog.title' | t }}
              </h2>
              @if (familyName()) {
                <span hlmBadge variant="outline">{{ familyName() }}</span>
              }
            </div>
            <p class="text-xs text-muted-foreground">
              {{ 'inviteDialog.subtitle' | t }}
            </p>
          </div>
          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="sm"
            [attr.aria-label]="'inviteDialog.close' | t"
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

        @if (createdInvite(); as invite) {
          <div class="space-y-4">
            <div class="border border-border bg-muted/20 p-4 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-sm font-semibold">{{ 'inviteDialog.createdTitle' | t }}</h3>
                <span hlmBadge>{{ roleKey(invite.role) | t }}</span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ 'inviteDialog.createdDescription' | t }}
              </p>
            </div>

            <div class="space-y-1.5">
              <label for="invite-generated-link" class="text-xs font-medium text-muted-foreground">
                {{ 'join.pasteLabel' | t }}
              </label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  id="invite-generated-link"
                  hlmInput
                  readonly
                  class="font-mono text-xs flex-1"
                  [value]="joinUrl()"
                  aria-label="Generated join link"
                />
                <button
                  hlmBtn
                  type="button"
                  size="sm"
                  (click)="copyValue(joinUrl(), 'link')"
                >
                  {{
                    copiedKind() === 'link'
                      ? ('inviteDialog.copied' | t)
                      : ('inviteDialog.copyLink' | t)
                  }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="border border-border p-3 space-y-1">
                <div class="text-muted-foreground">{{ 'join.tokenLabel' | t }}</div>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono truncate">{{ invite.token }}</span>
                  <button
                    hlmBtn
                    type="button"
                    variant="outline"
                    size="sm"
                    (click)="copyValue(invite.token, 'token')"
                  >
                    {{
                      copiedKind() === 'token'
                        ? ('inviteDialog.copied' | t)
                        : ('inviteDialog.copyToken' | t)
                    }}
                  </button>
                </div>
              </div>
              <div class="border border-border p-3 space-y-1">
                <div class="text-muted-foreground">{{ 'inviteDialog.expiresAt' | t }}</div>
                <div class="font-mono">{{ invite.expires_at }}</div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
              <button hlmBtn type="button" variant="outline" (click)="resetForAnother()">
                {{ 'inviteDialog.createAnother' | t }}
              </button>
              <button hlmBtn type="button" (click)="closeDialog()">
                {{ 'inviteDialog.done' | t }}
              </button>
            </div>
          </div>
        } @else {
          <form class="space-y-4" (submit)="submit($event)">
            <div class="space-y-2">
              <span class="text-xs font-medium">{{ 'inviteDialog.roleLabel' | t }}</span>
              <div class="grid grid-cols-3 gap-2" role="radiogroup">
                @for (role of inviteableRoles; track role) {
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
              <p class="border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                {{ roleHintKey() | t }}
              </p>
            </div>

            @if (selectedRole() === 'other') {
              <app-permission-checklist
                [legend]="'inviteDialog.permissionsLegend' | t"
                [disabled]="submitting()"
                [(selected)]="selectedPermissions"
              />
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label for="invite-relationship" class="text-xs font-medium">
                  {{ 'inviteDialog.relationshipLabel' | t }}
                </label>
                <input
                  id="invite-relationship"
                  hlmInput
                  type="text"
                  maxlength="80"
                  [disabled]="submitting()"
                  [value]="relationship()"
                  [placeholder]="'inviteDialog.relationshipPlaceholder' | t"
                  (input)="onRelationshipInput($event)"
                />
                @if (relationshipTooLong()) {
                  <p class="text-xs text-destructive">
                    {{ 'inviteDialog.relationshipTooLong' | t }}
                  </p>
                }
              </div>

              <div class="space-y-1.5">
                <label for="invite-ttl" class="text-xs font-medium">
                  {{ 'inviteDialog.ttlLabel' | t }}
                </label>
                <select
                  id="invite-ttl"
                  class="flex h-9 w-full border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  [disabled]="submitting()"
                  [value]="ttlHours()"
                  (change)="onTtlChange($event)"
                >
                  @for (opt of ttlOptions; track opt.hours) {
                    <option [value]="opt.hours">{{ opt.labelKey | t }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                hlmBtn
                type="button"
                variant="outline"
                [disabled]="submitting()"
                (click)="closeDialog()"
              >
                {{ 'inviteDialog.cancel' | t }}
              </button>
              <button hlmBtn type="submit" [disabled]="submitting() || relationshipTooLong()">
                {{
                  submitting()
                    ? ('inviteDialog.submitting' | t)
                    : ('inviteDialog.submit' | t)
                }}
              </button>
            </div>
          </form>
        }
      </section>
    </div>
  `,
})
export class InviteMemberDialogComponent {
  readonly familyId = input.required<string>();
  readonly familyName = input<string>('');
  readonly closed = output<void>();

  private readonly api = inject(FamilyApiClient);
  private readonly i18n = inject(I18nService);
  private readonly doc = inject(DOCUMENT);

  protected readonly inviteableRoles = INVITEABLE_ROLES;
  protected readonly ttlOptions = TTL_OPTIONS;

  protected readonly selectedRole = signal<InviteableRole>('member');
  protected readonly selectedPermissions = signal<readonly Permission[]>([]);
  protected readonly relationship = signal('');
  protected readonly ttlHours = signal<number>(168);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createdInvite = signal<InviteResponse | null>(null);
  protected readonly copiedKind = signal<'link' | 'token' | null>(null);

  protected readonly relationshipTooLong = computed(() => this.relationship().trim().length > 64);

  protected readonly roleHintKey = computed((): TranslationKey => {
    switch (this.selectedRole()) {
      case 'member':
        return 'inviteDialog.roleMemberHint';
      case 'child':
        return 'inviteDialog.roleChildHint';
      case 'other':
        return 'inviteDialog.roleOtherHint';
    }
  });

  protected readonly joinUrl = computed(() => {
    const invite = this.createdInvite();
    if (!invite) {
      return '';
    }
    const origin = this.doc.location?.origin || 'http://localhost';
    const params = new URLSearchParams({
      familyId: invite.family_id,
      token: invite.token,
    });
    return `${origin}/join?${params.toString()}`;
  });

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

  protected selectRole(role: InviteableRole): void {
    this.selectedRole.set(role);
    if (role !== 'other') {
      this.selectedPermissions.set([]);
    }
    this.errorMessage.set(null);
  }

  protected onRelationshipInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.relationship.set(target.value);
    }
  }

  protected onTtlChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      const parsed = Number.parseInt(target.value, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 720) {
        this.ttlHours.set(parsed);
      }
    }
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting() || this.relationshipTooLong()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.copiedKind.set(null);

    const role = this.selectedRole();
    const trimmedRelationship = this.relationship().trim();
    const request: CreateInviteRequest = {
      role,
      ttl_hours: this.ttlHours(),
      ...(role === 'other' ? { permissions: [...this.selectedPermissions()] } : {}),
      ...(trimmedRelationship ? { relationship: trimmedRelationship } : {}),
    };

    try {
      const invite = await firstValueFrom(this.api.createInvite(this.familyId(), request));
      this.createdInvite.set(invite);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async copyValue(value: string, kind: 'link' | 'token'): Promise<void> {
    try {
      await this.doc.defaultView?.navigator?.clipboard?.writeText(value);
      this.copiedKind.set(kind);
    } catch {
      this.copiedKind.set(null);
    }
  }

  protected resetForAnother(): void {
    this.createdInvite.set(null);
    this.copiedKind.set(null);
    this.errorMessage.set(null);
    this.relationship.set('');
    this.selectedPermissions.set([]);
  }

  protected closeDialog(): void {
    this.closed.emit();
  }
}
