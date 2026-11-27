import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { firstValueFrom } from 'rxjs';
import { WorkspaceStore } from '../../../../core/context/stores/workspace';
import { ApiHttpError } from '../../../../core/http/models/api-http-error';
import { TranslatePipe } from '../../../../core/i18n/pipes/translate';
import { I18nService } from '../../../../core/i18n/services/i18n';
import { CurrencyCombobox } from '../../../../shared/components/currency-combobox/currency-combobox';
import { FamilyDeletedCard } from '../../components/family-deleted-card/family-deleted-card';
import type { FamilyResponse } from '../../models/family-dto';
import { FamilyApi } from '../../services/family-api';
import { isFamilyEvictionError } from '../../utils/family-eviction';

@Component({
  selector: 'app-family-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyCombobox,
    FamilyDeletedCard,
    HlmButton,
    HlmCardImports,
    HlmInput,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './family-settings.html',
  styleUrl: './family-settings.css',
})
export class FamilySettings {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FamilyApi);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  private requestCounter = 0;
  private skipSwitchVersion: number | null = null;

  protected readonly loadedFamily = signal<FamilyResponse | null>(null);
  protected readonly draftName = signal('');
  protected readonly homeCurrency = signal('MDL');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly savedBanner = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly evictedCode = signal<string | null>(null);
  protected readonly hasRemainingWorkspace = signal(false);

  protected readonly isOwner = computed(() => this.workspaceStore.activeRole() === 'owner');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
  });

  protected readonly isDirty = computed(() => {
    const loaded = this.loadedFamily();
    if (!loaded) {
      return false;
    }
    return (
      this.draftName().trim() !== loaded.name ||
      this.homeCurrency().trim().toUpperCase() !== loaded.home_currency
    );
  });

  protected readonly canSubmit = computed(
    () => !this.saving() && this.isDirty() && this.draftName().trim().length > 0,
  );

  constructor() {
    effect(() => {
      const familyId = this.workspaceStore.activeFamilyId();
      const switchVer = this.workspaceStore.switchVersion();
      if (this.skipSwitchVersion !== null && this.skipSwitchVersion === switchVer) {
        return;
      }
      this.skipSwitchVersion = null;
      if (familyId) {
        void this.loadFamily(familyId);
      }
    });
  }

  protected showNameError(): boolean {
    const control = this.form.controls.name;
    return control.invalid && (control.touched || this.submitted());
  }

  protected onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.draftName.set(target.value);
    this.savedBanner.set(false);
  }

  protected resetForm(): void {
    const loaded = this.loadedFamily();
    if (!loaded) {
      return;
    }
    this.form.setValue({ name: loaded.name });
    this.draftName.set(loaded.name);
    this.homeCurrency.set(loaded.home_currency);
    this.savedBanner.set(false);
    this.errorMessage.set(null);
    this.submitted.set(false);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.savedBanner.set(false);
    this.errorMessage.set(null);

    if (this.form.invalid || !this.isOwner()) {
      this.form.markAllAsTouched();
      return;
    }

    const familyId = this.workspaceStore.activeFamilyId();
    if (!familyId) {
      return;
    }

    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.updateFamily(familyId, {
          name: this.form.getRawValue().name.trim(),
          home_currency: this.homeCurrency().trim().toUpperCase(),
        }),
      );
      this.loadedFamily.set(updated);
      this.form.setValue({ name: updated.name });
      this.draftName.set(updated.name);
      this.homeCurrency.set(updated.home_currency);
      this.workspaceStore.applyFamilyProfileUpdate(updated);
      this.savedBanner.set(true);
    } catch (err: unknown) {
      this.handleApiError(familyId, err);
    } finally {
      this.saving.set(false);
    }
  }

  protected recoverToRemaining(): void {
    this.evictedCode.set(null);
    this.skipSwitchVersion = null;
    const nextId = this.workspaceStore.activeFamilyId();
    if (nextId) {
      void this.loadFamily(nextId);
    }
  }

  protected goToOnboarding(): void {
    void this.router.navigate(['/onboarding']);
  }

  private async loadFamily(familyId: string): Promise<void> {
    const seq = ++this.requestCounter;
    this.loading.set(true);
    this.savedBanner.set(false);
    this.errorMessage.set(null);
    this.evictedCode.set(null);
    this.loadedFamily.set(null);

    try {
      const loaded = await firstValueFrom(this.api.getFamily(familyId));
      if (seq !== this.requestCounter) {
        return;
      }
      this.loadedFamily.set(loaded);
      this.form.setValue({ name: loaded.name });
      this.draftName.set(loaded.name);
      this.homeCurrency.set(loaded.home_currency);
      this.workspaceStore.applyFamilyProfileUpdate(loaded);
    } catch (err: unknown) {
      if (seq !== this.requestCounter) {
        return;
      }
      this.handleApiError(familyId, err);
    } finally {
      if (seq === this.requestCounter) {
        this.loading.set(false);
      }
    }
  }

  private handleApiError(familyId: string, err: unknown): void {
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
  }
}
