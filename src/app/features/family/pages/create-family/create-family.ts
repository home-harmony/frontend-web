import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { CurrencyCombobox } from '../../../../shared/components/currency-combobox/currency-combobox';
import { TopControls } from '../../../../shared/components/top-controls/top-controls';
import { FamilyApi } from '../../services/family-api';

@Component({
  selector: 'app-create-family',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyCombobox,
    HlmButton,
    HlmCardImports,
    HlmInput,
    ReactiveFormsModule,
    TopControls,
    TranslatePipe,
  ],
  templateUrl: './create-family.html',
  styleUrl: './create-family.css',
})
export class CreateFamily {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly familyApi = inject(FamilyApi);
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
      const trimmedOwner = ownerDisplayName.trim();
      const created = await firstValueFrom(
        this.familyApi.createFamily({
          name: name.trim(),
          home_currency: this.homeCurrency().trim().toUpperCase(),
          owner_display_name: trimmedOwner,
        }),
      );
      this.workspaceStore.registerCreatedFamily(created, trimmedOwner);
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
