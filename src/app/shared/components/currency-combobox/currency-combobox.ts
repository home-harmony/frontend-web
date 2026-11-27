import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { HlmInput } from '@spartan-ng/helm/input';
import { TranslatePipe } from '../../../core/i18n/pipes/translate';
import { COMMON_CURRENCIES } from '../../models/currency';

const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

@Component({
  selector: 'app-currency-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, TranslatePipe],
  templateUrl: './currency-combobox.html',
  styleUrl: './currency-combobox.css',
})
export class CurrencyCombobox {
  readonly inputId = input('home-currency');
  readonly value = model('MDL');

  protected readonly open = signal(false);
  protected readonly query = signal('');

  protected readonly selectedOption = computed(
    () => COMMON_CURRENCIES.find((item) => item.code === this.value()) ?? null,
  );

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return COMMON_CURRENCIES;
    }
    return COMMON_CURRENCIES.filter(
      (item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
    );
  });

  protected readonly customIsoCode = computed(() => {
    const upper = this.query().trim().toUpperCase();
    return ISO_CURRENCY_PATTERN.test(upper) ? upper : null;
  });

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.query.set(target.value);
  }

  protected choose(code: string): void {
    this.value.set(code);
    this.open.set(false);
    this.query.set('');
  }
}
