import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type { MemberResponse, Permission, Role } from '../../core/api/family.dto';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  FamilyDeletedCardComponent,
  isFamilyEvictionError,
} from '../family/family-deleted-card.component';
import { EditMemberRoleDialogComponent } from './edit-member-role-dialog.component';
import { InviteMemberDialogComponent } from './invite-member-dialog.component';
import { RemoveMemberDialogComponent } from './remove-member-dialog.component';

@Component({
  selector: 'app-members-directory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EditMemberRoleDialogComponent,
    FamilyDeletedCardComponent,
    HlmBadge,
    HlmButton,
    HlmCardImports,
    HlmTableImports,
    InviteMemberDialogComponent,
    RemoveMemberDialogComponent,
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
              <h1 class="text-lg font-semibold tracking-tight">{{ 'members.title' | t }}</h1>
              @if (!loading()) {
                <span hlmBadge variant="outline" class="font-mono">
                  {{ members().length }} {{ 'members.activeCount' | t }}
                </span>
              }
            </div>
            <p class="text-xs text-muted-foreground">{{ 'members.subtitle' | t }}</p>
          </div>

          @if (isOwner()) {
            <button hlmBtn size="sm" type="button" (click)="inviteDialogOpen.set(true)">
              {{ 'overview.inviteMember' | t }}
            </button>
          }
        </div>

        @if (!isOwner() && workspaceStore.activeWorkspace()) {
          <div
            class="border border-border bg-accent/40 px-3 py-2.5 text-xs text-foreground"
            data-testid="members-readonly-notice"
          >
            {{ 'members.readOnlyNotice' | t }}
          </div>
        }

        @if (errorMessage(); as message) {
          <div
            role="alert"
            class="border border-destructive bg-card text-destructive px-3 py-2.5 text-xs"
          >
            {{ message }}
          </div>
        }

        @if (loading() && members().length === 0) {
          <p class="text-xs text-muted-foreground">{{ 'common.loading' | t }}</p>
        } @else if (members().length === 0 && !errorMessage()) {
          <section hlmCard class="p-6 text-xs text-muted-foreground">
            {{ 'members.empty' | t }}
          </section>
        } @else if (members().length > 0) {
          <!-- Desktop Table -->
          <section hlmCard class="hidden md:block p-0 overflow-hidden">
            <div hlmTableContainer>
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh>{{ 'members.col.member' | t }}</th>
                    <th hlmTh>{{ 'members.col.role' | t }}</th>
                    <th hlmTh>{{ 'members.col.relationship' | t }}</th>
                    <th hlmTh>{{ 'members.col.access' | t }}</th>
                    <th hlmTh>{{ 'members.col.joined' | t }}</th>
                    <th hlmTh class="text-right">{{ 'members.col.actions' | t }}</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (member of members(); track member.id) {
                    <tr hlmTr [attr.data-member-id]="member.id">
                      <td hlmTd class="font-medium text-foreground">{{ member.display_name }}</td>
                      <td hlmTd>
                        <span hlmBadge [variant]="member.role === 'owner' ? 'default' : 'outline'">
                          {{ roleKey(member.role) | t }}
                        </span>
                      </td>
                      <td hlmTd class="text-muted-foreground">{{ member.relationship || '—' }}</td>
                      <td hlmTd class="whitespace-normal">
                        @if (member.role === 'other') {
                          @if (member.permissions.length === 0) {
                            <span class="text-xs italic text-muted-foreground">
                              {{ 'members.noCustomPermissions' | t }}
                            </span>
                          } @else {
                            <div class="flex flex-wrap gap-1">
                              @for (perm of member.permissions; track perm) {
                                <span hlmBadge variant="outline">{{ permissionKey(perm) | t }}</span>
                              }
                            </div>
                          }
                        } @else {
                          <span hlmBadge variant="outline">{{ presetKey(member.role) | t }}</span>
                        }
                      </td>
                      <td hlmTd class="font-mono text-muted-foreground">
                        {{ joinedDate(member.joined_at) }}
                      </td>
                      <td hlmTd class="text-right">
                        @if (member.role === 'owner') {
                          <span hlmBadge variant="outline" class="font-mono">
                            {{ 'members.protectedOwner' | t }}
                          </span>
                        } @else if (isOwner()) {
                          <div class="inline-flex items-center gap-1.5">
                            <button
                              hlmBtn
                              type="button"
                              variant="outline"
                              size="sm"
                              [attr.data-edit-member-id]="member.id"
                              (click)="editingMember.set(member)"
                            >
                              {{ 'members.action.editRole' | t }}
                            </button>
                            <button
                              hlmBtn
                              type="button"
                              variant="outline"
                              size="sm"
                              class="text-destructive border-destructive hover:bg-destructive/10"
                              [attr.data-remove-member-id]="member.id"
                              (click)="removingMember.set(member)"
                            >
                              {{ 'members.action.remove' | t }}
                            </button>
                          </div>
                        } @else {
                          <span class="text-muted-foreground">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Mobile Stacked Cards -->
          <div class="space-y-2.5 md:hidden">
            @for (member of members(); track member.id) {
              <article hlmCard class="p-3.5 space-y-2.5">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="text-sm font-semibold">{{ member.display_name }}</div>
                    <div class="text-xs text-muted-foreground">
                      {{ member.relationship || '—' }} · {{ joinedDate(member.joined_at) }}
                    </div>
                  </div>
                  <span hlmBadge [variant]="member.role === 'owner' ? 'default' : 'outline'">
                    {{ roleKey(member.role) | t }}
                  </span>
                </div>

                <div>
                  @if (member.role === 'other') {
                    @if (member.permissions.length === 0) {
                      <span class="text-xs italic text-muted-foreground">
                        {{ 'members.noCustomPermissions' | t }}
                      </span>
                    } @else {
                      <div class="flex flex-wrap gap-1">
                        @for (perm of member.permissions; track perm) {
                          <span hlmBadge variant="outline">{{ permissionKey(perm) | t }}</span>
                        }
                      </div>
                    }
                  } @else {
                    <span hlmBadge variant="outline">{{ presetKey(member.role) | t }}</span>
                  }
                </div>

                <div class="pt-2 border-t border-border flex justify-end">
                  @if (member.role === 'owner') {
                    <span hlmBadge variant="outline" class="font-mono">
                      {{ 'members.protectedOwner' | t }}
                    </span>
                  } @else if (isOwner()) {
                    <div class="flex items-center gap-1.5">
                      <button
                        hlmBtn
                        type="button"
                        variant="outline"
                        size="sm"
                        (click)="editingMember.set(member)"
                      >
                        {{ 'members.action.editRole' | t }}
                      </button>
                      <button
                        hlmBtn
                        type="button"
                        variant="outline"
                        size="sm"
                        class="text-destructive border-destructive"
                        (click)="removingMember.set(member)"
                      >
                        {{ 'members.action.remove' | t }}
                      </button>
                    </div>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>

      @if (inviteDialogOpen() && isOwner() && workspaceStore.activeFamilyId(); as activeFamilyId) {
        <app-invite-member-dialog
          [familyId]="activeFamilyId"
          [familyName]="familyName()"
          (closed)="inviteDialogOpen.set(false)"
        />
      }

      @if (editingMember(); as targetEdit) {
        @if (isOwner() && workspaceStore.activeFamilyId(); as activeFamilyId) {
          <app-edit-member-role-dialog
            [familyId]="activeFamilyId"
            [member]="targetEdit"
            (closed)="editingMember.set(null)"
            (updated)="onMemberUpdated($event)"
          />
        }
      }

      @if (removingMember(); as targetRemove) {
        @if (isOwner() && workspaceStore.activeFamilyId(); as activeFamilyId) {
          <app-remove-member-dialog
            [familyId]="activeFamilyId"
            [member]="targetRemove"
            (closed)="removingMember.set(null)"
            (removed)="onMemberRemoved($event)"
          />
        }
      }
    }
  `,
})
export class MembersDirectoryComponent {
  protected readonly workspaceStore = inject(WorkspaceStore);
  private readonly api = inject(FamilyApiClient);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private requestCounter = 0;
  private skipSwitchVersion: number | null = null;

  protected readonly members = signal<readonly MemberResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly evictedCode = signal<string | null>(null);
  protected readonly hasRemainingWorkspace = signal(false);
  protected readonly inviteDialogOpen = signal(false);
  protected readonly editingMember = signal<MemberResponse | null>(null);
  protected readonly removingMember = signal<MemberResponse | null>(null);

  protected readonly isOwner = computed(() => this.workspaceStore.activeRole() === 'owner');
  protected readonly familyName = computed(
    () => this.workspaceStore.activeWorkspace()?.family.name ?? '',
  );

  constructor() {
    effect(() => {
      const familyId = this.workspaceStore.activeFamilyId();
      const switchVer = this.workspaceStore.switchVersion();
      if (this.skipSwitchVersion !== null && this.skipSwitchVersion === switchVer) {
        return;
      }
      this.skipSwitchVersion = null;
      this.inviteDialogOpen.set(false);
      this.editingMember.set(null);
      this.removingMember.set(null);
      if (familyId) {
        void this.loadMembers(familyId);
      }
    });
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected presetKey(role: Role): TranslationKey {
    switch (role) {
      case 'owner':
        return 'members.presetOwner';
      case 'member':
        return 'members.presetMember';
      case 'child':
      case 'other':
        return 'members.presetChild';
    }
  }

  protected permissionKey(permission: Permission): TranslationKey {
    return `permissions.${permission}` as const;
  }

  protected joinedDate(raw: string): string {
    return raw.slice(0, 10);
  }

  protected onMemberUpdated(updated: MemberResponse): void {
    this.members.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    this.editingMember.set(null);
  }

  protected onMemberRemoved(memberId: string): void {
    this.members.update((list) => list.filter((item) => item.id !== memberId));
    this.removingMember.set(null);
    const activeFamilyId = this.workspaceStore.activeFamilyId();
    if (activeFamilyId) {
      void this.loadMembers(activeFamilyId);
    }
  }

  protected recoverToRemaining(): void {
    this.evictedCode.set(null);
    this.skipSwitchVersion = null;
    const nextId = this.workspaceStore.activeFamilyId();
    if (nextId) {
      void this.loadMembers(nextId);
    }
  }

  protected goToOnboarding(): void {
    void this.router.navigate(['/onboarding']);
  }

  private async loadMembers(familyId: string): Promise<void> {
    const seq = ++this.requestCounter;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.evictedCode.set(null);
    this.members.set([]);

    try {
      const response = await firstValueFrom(this.api.listMembers(familyId));
      if (seq !== this.requestCounter) {
        return;
      }
      this.members.set(response.items);
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
