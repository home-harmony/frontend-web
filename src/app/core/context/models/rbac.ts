export type Role = 'owner' | 'member' | 'child' | 'other';

export type Permission =
  | 'record_own_transactions'
  | 'record_any_transaction'
  | 'view_all_transactions'
  | 'view_all_accounts'
  | 'manage_own_accounts'
  | 'view_loans'
  | 'view_budget'
  | 'view_reports';

export const ALL_PERMISSIONS: readonly Permission[] = [
  'record_own_transactions',
  'record_any_transaction',
  'view_all_transactions',
  'view_all_accounts',
  'manage_own_accounts',
  'view_loans',
  'view_budget',
  'view_reports',
] as const;
