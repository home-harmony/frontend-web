import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { EN_MESSAGES, type TranslationKey } from './messages.en';
import { RU_MESSAGES } from './messages.ru';

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    TestBed.configureTestingModule({});
  });

  it('maintains strict key parity and non-empty translations between EN and RU', () => {
    const enKeys = Object.keys(EN_MESSAGES).sort();
    const ruKeys = Object.keys(RU_MESSAGES).sort();

    expect(ruKeys).toEqual(enKeys);

    for (const key of enKeys as TranslationKey[]) {
      expect(EN_MESSAGES[key].trim().length).toBeGreaterThan(0);
      expect(RU_MESSAGES[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('switches locales, persists to localStorage, and syncs document lang', () => {
    const service = TestBed.inject(I18nService);

    service.setLocale('ru');
    expect(service.locale()).toBe('ru');
    expect(localStorage.getItem('fl_locale')).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(service.t('roles.owner')).toBe('Владелец');

    service.setLocale('en');
    expect(service.locale()).toBe('en');
    expect(localStorage.getItem('fl_locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(service.t('roles.owner')).toBe('Owner');
  });

  it('supports {{param}} interpolation', () => {
    const service = TestBed.inject(I18nService);

    service.setLocale('en');
    expect(service.t('common.welcome', { name: 'Alice' })).toBe('Welcome, Alice');
    expect(service.t('common.welcome')).toBe('Welcome, {{name}}');

    service.setLocale('ru');
    expect(service.t('common.welcome', { name: 'Алиса' })).toBe('Добро пожаловать, Алиса');
  });
});
