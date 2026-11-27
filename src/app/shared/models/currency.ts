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
