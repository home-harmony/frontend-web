import { Injectable, signal } from '@angular/core';
import { resolveProblemErrorKey } from '../errors/problem-details';
import { EN_MESSAGES, type TranslationKey } from './messages.en';
import { RU_MESSAGES } from './messages.ru';

export type SupportedLocale = 'en' | 'ru';

const LOCALE_STORAGE_KEY = 'fl_locale';

const DICTIONARIES: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: EN_MESSAGES,
  ru: RU_MESSAGES,
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<SupportedLocale>(this.detectInitialLocale());

  constructor() {
    this.syncDocumentLang(this.locale());
  }

  setLocale(locale: SupportedLocale): void {
    this.locale.set(locale);
    this.persistLocale(locale);
    this.syncDocumentLang(locale);
  }

  t(key: TranslationKey, params?: Readonly<Record<string, string | number>>): string {
    const template = DICTIONARIES[this.locale()][key];
    if (!params) {
      return template;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  }

  translateError(error: unknown): string {
    return this.t(resolveProblemErrorKey(error));
  }

  private detectInitialLocale(): SupportedLocale {
    const stored = this.readStoredLocale();
    if (stored) {
      return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')) {
      return 'ru';
    }
    return 'en';
  }

  private readStoredLocale(): SupportedLocale | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
      return raw === 'en' || raw === 'ru' ? raw : null;
    } catch {
      return null;
    }
  }

  private persistLocale(locale: SupportedLocale): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }
    } catch {
      // Ignore storage quota or restricted context failures.
    }
  }

  private syncDocumentLang(locale: SupportedLocale): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = locale;
    }
  }
}
