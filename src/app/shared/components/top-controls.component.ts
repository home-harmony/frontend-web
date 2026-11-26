import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceStore } from '../../core/context/workspace.store';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  COLOR_MODES,
  THEME_IDS,
  ThemeService,
  type ColorMode,
  type ThemeId,
} from '../../core/theme/theme.service';

@Component({
  selector: 'app-top-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, TranslatePipe],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <select
        class="border border-input bg-background text-foreground h-7 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        [attr.aria-label]="'theme.label' | t"
        [value]="themeService.theme()"
        (change)="onThemeChange($event)"
      >
        @for (id of themeIds; track id) {
          <option [value]="id" [selected]="id === themeService.theme()">
            {{ themeKey(id) | t }}
          </option>
        }
      </select>

      <button
        hlmBtn
        type="button"
        variant="outline"
        size="sm"
        [attr.aria-label]="'theme.mode.label' | t"
        (click)="cycleColorMode()"
      >
        {{ modeKey(themeService.colorMode()) | t }}
      </button>

      <button
        hlmBtn
        type="button"
        variant="outline"
        size="sm"
        [attr.aria-label]="'common.language' | t"
        (click)="toggleLocale()"
      >
        {{ localeLabel() }}
      </button>

      <button hlmBtn type="button" variant="secondary" size="sm" (click)="signOut()">
        {{ 'common.signOut' | t }}
      </button>
    </div>
  `,
})
export class TopControlsComponent {
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
