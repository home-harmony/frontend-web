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

export interface CreateFamilyRequest {
  readonly name: string;
  readonly home_currency: string;
  readonly owner_display_name: string;
}

export interface CreateFamilyResponse {
  readonly id: string;
  readonly name: string;
  readonly home_currency: string;
  readonly owner_member_id: string;
  readonly created_at: string;
}

export interface UpdateFamilyRequest {
  readonly name: string;
  readonly home_currency: string;
}

export interface FamilyResponse {
  readonly id: string;
  readonly name: string;
  readonly home_currency: string;
  readonly created_at: string;
}

export interface CreateInviteRequest {
  readonly role: Role;
  readonly permissions?: readonly Permission[];
  readonly relationship?: string | null;
  readonly ttl_hours?: number | null;
}

export interface InviteResponse {
  readonly token: string;
  readonly family_id: string;
  readonly role: Role;
  readonly permissions: readonly Permission[];
  readonly relationship: string | null;
  readonly created_by: string;
  readonly created_at: string;
  readonly expires_at: string;
}

export interface AcceptInviteRequest {
  readonly token: string;
  readonly display_name: string;
}

export interface ChangeMemberRoleRequest {
  readonly role: Role;
  readonly permissions?: readonly Permission[];
}

export interface MemberResponse {
  readonly id: string;
  readonly family_id: string;
  readonly user_id: string;
  readonly display_name: string;
  readonly role: Role;
  readonly permissions: readonly Permission[];
  readonly relationship: string | null;
  readonly joined_at: string;
}

export interface ListMembersResponse {
  readonly items: readonly MemberResponse[];
}

export interface FamilySummaryDto {
  readonly id: string;
  readonly name: string;
  readonly home_currency: string;
}

export interface MemberSummaryDto {
  readonly role: Role;
  readonly display_name: string;
}

export interface UserFamilySummaryDto {
  readonly family: FamilySummaryDto;
  readonly membership: MemberSummaryDto;
}

export interface ListUserFamiliesResponse {
  readonly items: readonly UserFamilySummaryDto[];
}
