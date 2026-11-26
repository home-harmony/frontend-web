import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { FamilyApiClient } from '../../core/api/family-api.client';
import type { MemberResponse, Role } from '../../core/api/family.dto';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TopControlsComponent } from '../../shared/components/top-controls.component';
import { parseInviteInput, type ParsedInviteLink } from '../onboarding/invite-link.parser';

@Component({
  selector: 'app-invite-accept',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadge, HlmButton, HlmCardImports, HlmInput, RouterLink, TopControlsComponent, TranslatePipe],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <header
        class="border-b border-border bg-card text-card-foreground px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="w-6 h-6 inline-flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground"
          >
            F
          </span>
          <span class="text-sm font-semibold tracking-tight">{{ 'app.name' | t }}</span>
          @if (auth.user(); as user) {
            <span hlmBadge variant="outline" class="hidden sm:inline-flex">{{ user.email }}</span>
          }
        </div>
        <app-top-controls />
      </header>

      <main class="flex-1 flex items-center justify-center p-4 md:p-8">
        <div class="w-full max-w-xl space-y-5">
          <div class="space-y-1.5">
            <span hlmBadge variant="outline" class="font-mono">{{ 'join.eyebrow' | t }}</span>
            <h1 class="text-xl font-semibold tracking-tight">{{ 'join.title' | t }}</h1>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ 'join.subtitle' | t }}
            </p>
          </div>

          @if (joinedMember(); as member) {
            <section hlmCard class="p-6 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-base font-semibold">{{ 'join.successTitle' | t }}</h2>
                <span hlmBadge>{{ roleKey(member.role) | t }}</span>
              </div>
              <p class="text-sm text-foreground">
                {{ 'join.successMessage' | t }}
                <span class="font-semibold">{{ member.display_name }}</span>.
              </p>
              <div class="border border-border bg-muted/20 p-3 text-xs space-y-1">
                <div>
                  <span class="text-muted-foreground">{{ 'join.targetFamilyLabel' | t }}:</span>
                  <span class="ml-1 font-mono">{{ member.family_id }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">{{ 'join.assignedRole' | t }}:</span>
                  <span class="ml-1 font-medium">{{ roleKey(member.role) | t }}</span>
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                <a hlmBtn routerLink="/workspace">
                  {{ 'join.openWorkspace' | t }}
                </a>
              </div>
            </section>
          } @else if (!invite()) {
            <section hlmCard class="p-6 space-y-4">
              <div class="space-y-1">
                <h2 class="text-sm font-semibold">{{ 'join.missingParamsTitle' | t }}</h2>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ 'join.missingParamsHint' | t }}
                </p>
              </div>

              @if (parseError()) {
                <div
                  role="alert"
                  class="border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {{ 'join.parseError' | t }}
                </div>
              }

              <form class="space-y-3" (submit)="applyPastedInvite($event)">
                <div class="space-y-1.5">
                  <label for="join-paste-input" class="text-xs font-medium">
                    {{ 'join.pasteLabel' | t }}
                  </label>
                  <input
                    id="join-paste-input"
                    hlmInput
                    type="text"
                    class="font-mono text-xs"
                    [value]="pasteInput()"
                    [placeholder]="'join.pastePlaceholder' | t"
                    (input)="onPasteInput($event)"
                  />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap gap-2">
                    @if (hasActiveWorkspace()) {
                      <a hlmBtn variant="outline" size="sm" routerLink="/workspace">
                        {{ 'join.backToWorkspace' | t }}
                      </a>
                    }
                    <a hlmBtn variant="outline" size="sm" routerLink="/onboarding">
                      {{ 'join.backToOnboarding' | t }}
                    </a>
                  </div>
                  <button hlmBtn type="submit" size="sm">
                    {{ 'onboarding.join.action' | t }}
                  </button>
                </div>
              </form>
            </section>
          } @else {
            <section hlmCard class="p-6 space-y-4">
              @if (errorMessage(); as message) {
                <div
                  role="alert"
                  class="border border-destructive bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
                >
                  {{ message }}
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="border border-border bg-muted/20 p-3 space-y-1">
                  <div class="text-muted-foreground">{{ 'join.targetFamilyLabel' | t }}</div>
                  <div class="font-mono break-all">{{ invite()!.familyId }}</div>
                </div>
                <div class="border border-border bg-muted/20 p-3 space-y-1">
                  <div class="text-muted-foreground">{{ 'join.tokenLabel' | t }}</div>
                  <div class="font-mono break-all">{{ maskedToken() }}</div>
                </div>
              </div>

              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ 'join.identityOnlyNote' | t }}
              </p>

              <form class="space-y-4" (submit)="submitJoin($event)">
                <div class="space-y-1.5">
                  <label for="join-display-name" class="text-xs font-medium">
                    {{ 'join.displayNameLabel' | t }}
                  </label>
                  <input
                    id="join-display-name"
                    hlmInput
                    type="text"
                    maxlength="100"
                    [disabled]="submitting()"
                    [value]="displayName()"
                    [placeholder]="'join.displayNamePlaceholder' | t"
                    (input)="onDisplayNameInput($event)"
                  />
                  @if (validationError(); as validationKey) {
                    <p class="text-xs text-destructive">{{ validationKey | t }}</p>
                  }
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div class="flex flex-wrap gap-2">
                    @if (hasActiveWorkspace()) {
                      <a hlmBtn variant="outline" size="sm" routerLink="/workspace">
                        {{ 'join.backToWorkspace' | t }}
                      </a>
                    }
                    <a hlmBtn variant="outline" size="sm" routerLink="/onboarding">
                      {{ 'join.backToOnboarding' | t }}
                    </a>
                  </div>

                  <button hlmBtn type="submit" [disabled]="submitting()">
                    {{ submitting() ? ('join.submitting' | t) : ('join.submit' | t) }}
                  </button>
                </div>
              </form>
            </section>
          }
        </div>
      </main>
    </div>
  `,
})
export class InviteAcceptComponent {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FamilyApiClient);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly manualInvite = signal<ParsedInviteLink | null>(null);
  protected readonly pasteInput = signal('');
  protected readonly parseError = signal(false);
  protected readonly displayName = signal(this.auth.user()?.name ?? '');
  protected readonly validationError = signal<TranslationKey | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly joinedMember = signal<MemberResponse | null>(null);

  protected readonly queryInvite = computed<ParsedInviteLink | null>(() => {
    const qp = this.queryParamMap();
    const familyId = qp.get('familyId')?.trim() ?? '';
    const token = qp.get('token')?.trim() ?? '';
    if (!familyId || !token) {
      return null;
    }
    return parseInviteInput(`${familyId}:${token}`);
  });

  protected readonly invite = computed<ParsedInviteLink | null>(
    () => this.manualInvite() ?? this.queryInvite(),
  );

  protected readonly hasActiveWorkspace = computed(
    () => this.workspaceStore.activeFamilyId() !== null || this.workspaceStore.families().length > 0,
  );

  protected readonly maskedToken = computed(() => {
    const token = this.invite()?.token ?? '';
    if (token.length <= 12) {
      return token;
    }
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  });

  constructor() {
    effect(() => {
      // Clear previous submission state when query parameters change.
      this.queryParamMap();
      this.errorMessage.set(null);
      this.validationError.set(null);
    });
  }

  protected roleKey(role: Role): TranslationKey {
    return `roles.${role}` as const;
  }

  protected onPasteInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.pasteInput.set(target.value);
      this.parseError.set(false);
    }
  }

  protected applyPastedInvite(event: Event): void {
    event.preventDefault();
    const parsed = parseInviteInput(this.pasteInput());
    if (!parsed) {
      this.parseError.set(true);
      return;
    }
    this.parseError.set(false);
    this.errorMessage.set(null);
    this.manualInvite.set(parsed);
  }

  protected onDisplayNameInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.displayName.set(target.value);
      this.validationError.set(null);
    }
  }

  protected async submitJoin(event: Event): Promise<void> {
    event.preventDefault();
    const target = this.invite();
    if (!target || this.submitting()) {
      return;
    }

    const trimmed = this.displayName().trim();
    if (!trimmed) {
      this.validationError.set('join.displayNameRequired');
      return;
    }
    if (trimmed.length > 80) {
      this.validationError.set('join.displayNameTooLong');
      return;
    }

    this.submitting.set(true);
    this.validationError.set(null);
    this.errorMessage.set(null);

    try {
      const member = await firstValueFrom(
        this.api.acceptInvite(target.familyId, {
          token: target.token,
          display_name: trimmed,
        }),
      );
      this.joinedMember.set(member);
      await this.workspaceStore.loadFamilies(true);
      this.workspaceStore.selectFamily(member.family_id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}
