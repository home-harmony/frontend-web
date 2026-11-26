import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

export const THEME_IDS = ['heritage-forest', 'private-navy', 'slate', 'zinc'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const COLOR_MODES = ['system', 'light', 'dark'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const DEFAULT_THEME: ThemeId = 'heritage-forest';
export const DEFAULT_COLOR_MODE: ColorMode = 'system';

const THEME_STORAGE_KEY = 'fl_theme';
const COLOR_MODE_STORAGE_KEY = 'fl_color_mode';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_MEDIA_QUERY)
      : null;

  private readonly systemPrefersDark = signal<boolean>(this.mediaQuery?.matches ?? false);

  readonly theme = signal<ThemeId>(this.readStoredTheme());
  readonly colorMode = signal<ColorMode>(this.readStoredColorMode());
  readonly resolvedMode = computed<'light' | 'dark'>(() => {
    const mode = this.colorMode();
    if (mode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    this.syncDocumentTheme(this.theme());
    this.syncDocumentColorMode(this.resolvedMode());

    if (this.mediaQuery) {
      const listener = (event: MediaQueryListEvent): void => {
        this.systemPrefersDark.set(event.matches);
        this.syncDocumentColorMode(this.resolvedMode());
      };
      this.mediaQuery.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => {
        this.mediaQuery?.removeEventListener('change', listener);
      });
    }
  }

  setTheme(theme: ThemeId): void {
    this.theme.set(theme);
    this.persistValue(THEME_STORAGE_KEY, theme);
    this.syncDocumentTheme(theme);
  }

  setColorMode(mode: ColorMode): void {
    this.colorMode.set(mode);
    this.persistValue(COLOR_MODE_STORAGE_KEY, mode);
    this.syncDocumentColorMode(this.resolvedMode());
  }

  private readStoredTheme(): ThemeId {
    const raw = this.readStorage(THEME_STORAGE_KEY);
    return THEME_IDS.includes(raw as ThemeId) ? (raw as ThemeId) : DEFAULT_THEME;
  }

  private readStoredColorMode(): ColorMode {
    const raw = this.readStorage(COLOR_MODE_STORAGE_KEY);
    return COLOR_MODES.includes(raw as ColorMode) ? (raw as ColorMode) : DEFAULT_COLOR_MODE;
  }

  private readStorage(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  private persistValue(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage quota or restricted context failures.
    }
  }

  private syncDocumentTheme(theme: ThemeId): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset['theme'] = theme;
    }
  }

  private syncDocumentColorMode(resolved: 'light' | 'dark'): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }
  }
}
