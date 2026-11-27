import { TestBed } from '@angular/core/testing';
import { DEFAULT_COLOR_MODE, DEFAULT_THEME, THEME_IDS } from '../models/theme';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    document.documentElement.classList.remove('dark');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('defaults to heritage-forest and system color mode', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe(DEFAULT_THEME);
    expect(service.colorMode()).toBe(DEFAULT_COLOR_MODE);
    expect(service.resolvedMode()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('heritage-forest');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches across all 4 themes and persists selection', () => {
    const service = TestBed.inject(ThemeService);

    for (const themeId of THEME_IDS) {
      service.setTheme(themeId);
      expect(service.theme()).toBe(themeId);
      expect(localStorage.getItem('fl_theme')).toBe(themeId);
      expect(document.documentElement.dataset['theme']).toBe(themeId);
    }
  });

  it('switches color modes (dark / light / system) and syncs .dark class', () => {
    const service = TestBed.inject(ThemeService);

    service.setColorMode('dark');
    expect(service.colorMode()).toBe('dark');
    expect(service.resolvedMode()).toBe('dark');
    expect(localStorage.getItem('fl_color_mode')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    service.setColorMode('light');
    expect(service.resolvedMode()).toBe('light');
    expect(localStorage.getItem('fl_color_mode')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    service.setColorMode('system');
    expect(service.resolvedMode()).toBe('light');
    expect(localStorage.getItem('fl_color_mode')).toBe('system');
  });

  it('restores valid persisted values and falls back safely on invalid storage values', () => {
    localStorage.setItem('fl_theme', 'private-navy');
    localStorage.setItem('fl_color_mode', 'dark');

    const restored = TestBed.inject(ThemeService);
    expect(restored.theme()).toBe('private-navy');
    expect(restored.colorMode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('private-navy');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    localStorage.setItem('fl_theme', 'unknown-theme');
    localStorage.setItem('fl_color_mode', 'sepia');

    const fallback = TestBed.inject(ThemeService);
    expect(fallback.theme()).toBe(DEFAULT_THEME);
    expect(fallback.colorMode()).toBe(DEFAULT_COLOR_MODE);
  });

  it('reacts to system prefers-color-scheme changes when in system mode', () => {
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (_event: string, cb: (e: MediaQueryListEvent) => void) => {
          changeListener = cb;
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const service = TestBed.inject(ThemeService);
    expect(service.resolvedMode()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    changeListener?.({ matches: true } as MediaQueryListEvent);
    expect(service.resolvedMode()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    changeListener?.({ matches: false } as MediaQueryListEvent);
    expect(service.resolvedMode()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
