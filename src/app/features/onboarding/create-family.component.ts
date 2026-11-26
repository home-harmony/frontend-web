import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { ApiHttpError } from '../../core/http/api-http-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CurrencyComboboxComponent } from '../../shared/components/currency-combobox.component';
import { TopControlsComponent } from '../../shared/components/top-controls.component';

@Component({
  selector: 'app-create-family',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyComboboxComponent,
    HlmButton,
    HlmCardImports,
    HlmInput,
    ReactiveFormsModule,
    TopControlsComponent,
    TranslatePipe,
  ],
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
        </div>
        <app-top-controls />
      </header>

      <main class="flex-1 flex items-center justify-center p-4 md:p-8">
        <div class="w-full max-w-lg space-y-4">
          <button
            type="button"
            class="text-xs font-medium text-muted-foreground hover:underline"
            (click)="goBack()"
          >
            ← {{ 'createFamily.back' | t }}
          </button>

          <form hlmCard class="p-5 md:p-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="space-y-1 pb-2 border-b border-border">
              <h1 class="text-base font-semibold tracking-tight">{{ 'createFamily.title' | t }}</h1>
              <p class="text-xs text-muted-foreground">{{ 'createFamily.subtitle' | t }}</p>
            </div>

            @if (apiError(); as message) {
              <div
                role="alert"
                class="border border-destructive bg-card text-destructive px-3 py-2.5 text-xs"
              >
                {{ message }}
              </div>
            }

            <div class="space-y-1.5">
              <label for="family-name" class="text-xs font-medium block">
                {{ 'createFamily.nameLabel' | t }}
              </label>
              <input
                id="family-name"
                hlmInput
                type="text"
                maxlength="100"
                formControlName="name"
                [placeholder]="'createFamily.namePlaceholder' | t"
              />
              @if (showControlError('name')) {
                <p class="text-xs text-destructive">{{ 'createFamily.nameRequired' | t }}</p>
              } @else {
                <p class="text-xs text-muted-foreground">{{ 'createFamily.nameHint' | t }}</p>
              }
            </div>

            <div class="space-y-1.5">
              <label for="home-currency" class="text-xs font-medium block">
                {{ 'createFamily.currencyLabel' | t }}
              </label>
              <app-currency-combobox inputId="home-currency" [(value)]="homeCurrency" />
            </div>

            <div class="space-y-1.5">
              <label for="owner-display-name" class="text-xs font-medium block">
                {{ 'createFamily.displayNameLabel' | t }}
              </label>
              <input
                id="owner-display-name"
                hlmInput
                type="text"
                maxlength="80"
                formControlName="ownerDisplayName"
                [placeholder]="'createFamily.displayNamePlaceholder' | t"
              />
              @if (showControlError('ownerDisplayName')) {
                <p class="text-xs text-destructive">{{ 'createFamily.displayNameRequired' | t }}</p>
              } @else {
                <p class="text-xs text-muted-foreground">
                  {{ 'createFamily.displayNameHint' | t }}
                </p>
              }
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button hlmBtn type="button" variant="outline" (click)="goBack()">
                {{ 'common.cancel' | t }}
              </button>
              <button hlmBtn type="submit" [disabled]="submitting()">
                {{ (submitting() ? 'createFamily.submitting' : 'createFamily.submit') | t }}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `,
})
export class CreateFamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);

  protected readonly homeCurrency = signal('MDL');
  protected readonly submitting = signal(false);
  protected readonly apiError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    ownerDisplayName: [
      this.auth.user()?.name ?? '',
      [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)],
    ],
  });

  protected showControlError(controlName: 'name' | 'ownerDisplayName'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected goBack(): void {
    const target = this.workspaceStore.families().length > 0 ? '/workspace' : '/onboarding';
    void this.router.navigate([target]);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.apiError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const { name, ownerDisplayName } = this.form.getRawValue();
      await this.workspaceStore.createFamily({
        name: name.trim(),
        home_currency: this.homeCurrency().trim().toUpperCase(),
        owner_display_name: ownerDisplayName.trim(),
      });
      await this.router.navigate(['/workspace']);
    } catch (err: unknown) {
      const message =
        err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
      this.apiError.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}
