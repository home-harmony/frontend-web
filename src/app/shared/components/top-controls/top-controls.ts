import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/auth/services/auth';
import { WorkspaceStore } from '../../../core/context/stores/workspace';
import type { TranslationKey } from '../../../core/i18n/models/messages-en';
import { TranslatePipe } from '../../../core/i18n/pipes/translate';
import { I18nService } from '../../../core/i18n/services/i18n';
import {
  COLOR_MODES,
  THEME_IDS,
  type ColorMode,
  type ThemeId,
} from '../../../core/theme/models/theme';
import { ThemeService } from '../../../core/theme/services/theme';

@Component({
  selector: 'app-top-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, TranslatePipe],
  templateUrl: './top-controls.html',
  styleUrl: './top-controls.css',
})
export class TopControls {
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly workspaceStore = inject(WorkspaceStore);

  protected readonly themeIds = THEME_IDS;
  protected readonly localeLabel = computed(() => this.i18n.locale().toUpperCase());

  protected themeKey(id: ThemeId): TranslationKey {
    return `theme.${id}` as const;
  }

  protected modeKey(mode: ColorMode): TranslationKey {
    return `theme.mode.${mode}` as const;
  }

  protected onThemeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selected = target.value as ThemeId;
    if (THEME_IDS.includes(selected)) {
      this.themeService.setTheme(selected);
    }
  }

  protected cycleColorMode(): void {
    const currentIndex = COLOR_MODES.indexOf(this.themeService.colorMode());
    const nextMode = COLOR_MODES[(currentIndex + 1) % COLOR_MODES.length];
    this.themeService.setColorMode(nextMode);
  }

  protected toggleLocale(): void {
    this.i18n.setLocale(this.i18n.locale() === 'en' ? 'ru' : 'en');
  }

  protected signOut(): void {
    this.workspaceStore.reset();
    this.auth.logout(true);
  }
}
