import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiHttpError } from '../../http/models/api-http-error';
import { I18nService } from '../../i18n/services/i18n';
import type { Role } from '../models/rbac';
import type { FamilySummaryDto, UserFamilySummaryDto } from '../models/workspace';
import { WorkspaceApi } from '../services/workspace-api';
import { ActiveFamilyStore } from './active-family';

@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly api = inject(WorkspaceApi);
  private readonly activeFamilyStore = inject(ActiveFamilyStore);
  private readonly i18n = inject(I18nService);

  private inFlightLoad: Promise<readonly UserFamilySummaryDto[]> | null = null;

  readonly families = signal<readonly UserFamilySummaryDto[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly switchVersion = signal(0);

  readonly activeFamilyId = this.activeFamilyStore.activeFamilyId;
  readonly activeWorkspace = computed<UserFamilySummaryDto | null>(() => {
    const id = this.activeFamilyId();
    if (!id) {
      return null;
    }
    return this.families().find((item) => item.family.id === id) ?? null;
  });
  readonly activeRole = computed<Role | null>(() => this.activeWorkspace()?.membership.role ?? null);

  async loadFamilies(force = false): Promise<readonly UserFamilySummaryDto[]> {
    if (!force && this.loaded()) {
      return this.families();
    }
    if (this.inFlightLoad) {
      return this.inFlightLoad;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.inFlightLoad = firstValueFrom(this.api.listUserFamilies())
      .then((response) => {
        const items = response.items;
        this.families.set(items);
        this.loaded.set(true);
        this.reconcileActiveFamily(items);
        return items;
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiHttpError ? err.localizedMessage : this.i18n.translateError(err);
        this.errorMessage.set(message);
        throw err;
      })
      .finally(() => {
        this.loading.set(false);
        this.inFlightLoad = null;
      });

    return this.inFlightLoad;
  }

  selectFamily(familyId: string): boolean {
    const exists = this.families().some((item) => item.family.id === familyId);
    if (!exists) {
      return false;
    }
    if (this.activeFamilyId() !== familyId) {
      this.activeFamilyStore.setActiveFamilyId(familyId);
      this.switchVersion.update((v) => v + 1);
    }
    return true;
  }

  registerCreatedFamily(family: FamilySummaryDto, ownerDisplayName: string): void {
    const summary: UserFamilySummaryDto = {
      family: {
        id: family.id,
        name: family.name,
        home_currency: family.home_currency,
      },
      membership: {
        role: 'owner',
        display_name: ownerDisplayName,
      },
    };
    this.families.update((prev) => [summary, ...prev]);
    this.loaded.set(true);
    this.errorMessage.set(null);
    this.activeFamilyStore.setActiveFamilyId(family.id);
    this.switchVersion.update((v) => v + 1);
  }

  applyFamilyProfileUpdate(updated: FamilySummaryDto): void {
    this.families.update((prev) =>
      prev.map((item) =>
        item.family.id === updated.id
          ? {
              ...item,
              family: {
                id: updated.id,
                name: updated.name,
                home_currency: updated.home_currency,
              },
            }
          : item,
      ),
    );
  }

  evictFamily(familyId: string): string | null {
    const remaining = this.families().filter((item) => item.family.id !== familyId);
    this.families.set(remaining);
    const nextId = remaining[0]?.family.id ?? null;
    this.activeFamilyStore.setActiveFamilyId(nextId);
    this.switchVersion.update((v) => v + 1);
    return nextId;
  }

  reset(): void {
    this.families.set([]);
    this.loaded.set(false);
    this.loading.set(false);
    this.errorMessage.set(null);
    this.switchVersion.set(0);
    this.activeFamilyStore.clear();
  }

  private reconcileActiveFamily(items: readonly UserFamilySummaryDto[]): void {
    if (items.length === 0) {
      this.activeFamilyStore.clear();
      return;
    }
    const currentId = this.activeFamilyId();
    if (currentId && items.some((item) => item.family.id === currentId)) {
      return;
    }
    this.activeFamilyStore.setActiveFamilyId(items[0].family.id);
  }
}
