import type { Permission, Role } from '../../../core/context/models/rbac';

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
