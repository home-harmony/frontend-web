import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { HlmInput } from '@spartan-ng/helm/input';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface CurrencyOption {
  readonly code: string;
  readonly name: string;
}

export const COMMON_CURRENCIES: readonly CurrencyOption[] = [
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'TRY', name: 'Turkish Lira' },
];

const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

@Component({
  selector: 'app-currency-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, TranslatePipe],
  template: `
    <div class="relative">
      <button
        type="button"
        class="w-full h-8 border border-input bg-background text-foreground px-2.5 text-xs flex items-center justify-between text-left focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        [attr.id]="inputId()"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        <span>
          <strong class="font-mono">{{ value() }}</strong>
          @if (selectedOption(); as option) {
            <span> — {{ option.name }}</span>
          }
        </span>
        <span class="text-muted-foreground">▾</span>
      </button>

      @if (open()) {
        <div
          class="absolute z-30 left-0 right-0 mt-1 p-2 space-y-1.5 border border-border bg-popover text-popover-foreground shadow-md"
        >
          <input
            hlmInput
            type="text"
            [value]="query()"
            [placeholder]="'createFamily.currencySearchPlaceholder' | t"
            (input)="onSearch($event)"
          />

          <div class="max-h-44 overflow-y-auto space-y-0.5">
            @for (currency of filtered(); track currency.code) {
              <button
                type="button"
                class="w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                [class.bg-accent]="currency.code === value()"
                [attr.data-currency-code]="currency.code"
                (click)="choose(currency.code)"
              >
                <span><strong class="font-mono">{{ currency.code }}</strong> · {{ currency.name }}</span>
                @if (currency.code === value()) {
                  <span>✓</span>
                }
              </button>
            } @empty {
              @if (customIsoCode(); as customCode) {
                <button
                  type="button"
                  class="w-full text-left px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                  (click)="choose(customCode)"
                >
                  {{ 'createFamily.currencyUseCustom' | t: { code: customCode } }}
                </button>
              } @else {
                <div class="px-2.5 py-1.5 text-xs text-muted-foreground">
                  {{ 'createFamily.currencyEmpty' | t }}
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CurrencyComboboxComponent {
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
