import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import type {
  AcceptInviteRequest,
  ChangeMemberRoleRequest,
  CreateFamilyRequest,
  CreateFamilyResponse,
  CreateInviteRequest,
  FamilyResponse,
  InviteResponse,
  ListMembersResponse,
  ListUserFamiliesResponse,
  MemberResponse,
  UpdateFamilyRequest,
} from './family.dto';

@Injectable({ providedIn: 'root' })
export class FamilyApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiUrl.replace(/\/+$/, '');

  listUserFamilies(): Observable<ListUserFamiliesResponse> {
    return this.http.get<ListUserFamiliesResponse>(`${this.baseUrl}/profile/families`);
  }

  createFamily(request: CreateFamilyRequest): Observable<CreateFamilyResponse> {
    return this.http.post<CreateFamilyResponse>(`${this.baseUrl}/families`, request);
  }

  getFamily(familyId: string): Observable<FamilyResponse> {
    return this.http.get<FamilyResponse>(`${this.baseUrl}/families/${familyId}`);
  }

  updateFamily(familyId: string, request: UpdateFamilyRequest): Observable<FamilyResponse> {
    return this.http.put<FamilyResponse>(`${this.baseUrl}/families/${familyId}`, request);
  }

  createInvite(familyId: string, request: CreateInviteRequest): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(`${this.baseUrl}/families/${familyId}/invites`, request);
  }

  acceptInvite(familyId: string, request: AcceptInviteRequest): Observable<MemberResponse> {
    return this.http.post<MemberResponse>(`${this.baseUrl}/families/${familyId}/members`, request);
  }

  listMembers(familyId: string): Observable<ListMembersResponse> {
    return this.http.get<ListMembersResponse>(`${this.baseUrl}/families/${familyId}/members`);
  }

  changeMemberRole(
    familyId: string,
    memberId: string,
    request: ChangeMemberRoleRequest,
  ): Observable<MemberResponse> {
    return this.http.patch<MemberResponse>(
      `${this.baseUrl}/families/${familyId}/members/${memberId}/role`,
      request,
    );
  }

  removeMember(familyId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/families/${familyId}/members/${memberId}`);
  }
}
