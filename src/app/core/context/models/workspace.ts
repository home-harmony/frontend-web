import type { Role } from './rbac';

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
