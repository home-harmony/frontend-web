export const THEME_IDS = ['heritage-forest', 'private-navy', 'slate', 'zinc'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const COLOR_MODES = ['system', 'light', 'dark'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const DEFAULT_THEME: ThemeId = 'heritage-forest';
export const DEFAULT_COLOR_MODE: ColorMode = 'system';
