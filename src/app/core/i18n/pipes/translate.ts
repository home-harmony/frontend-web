import { inject, Pipe, type PipeTransform } from '@angular/core';
import type { TranslationKey } from '../models/messages-en';
import { I18nService } from '../services/i18n';

@Pipe({
  name: 't',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: Readonly<Record<string, string | number>>): string {
    return this.i18n.t(key, params);
  }
}
