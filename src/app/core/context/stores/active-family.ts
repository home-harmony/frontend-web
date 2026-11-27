import { Injectable, signal } from '@angular/core';

const ACTIVE_FAMILY_STORAGE_KEY = 'fl_active_family_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class ActiveFamilyStore {
  readonly activeFamilyId = signal<string | null>(this.readStoredFamilyId());

  setActiveFamilyId(familyId: string | null): void {
    const normalized = familyId && UUID_PATTERN.test(familyId) ? familyId : null;
    this.activeFamilyId.set(normalized);
    this.persistFamilyId(normalized);
  }

  clear(): void {
    this.activeFamilyId.set(null);
    this.persistFamilyId(null);
  }

  private readStoredFamilyId(): string | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      const raw = localStorage.getItem(ACTIVE_FAMILY_STORAGE_KEY);
      return raw && UUID_PATTERN.test(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  private persistFamilyId(familyId: string | null): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      if (familyId) {
        localStorage.setItem(ACTIVE_FAMILY_STORAGE_KEY, familyId);
      } else {
        localStorage.removeItem(ACTIVE_FAMILY_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }
}
