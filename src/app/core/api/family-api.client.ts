import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import type {
  CreateFamilyRequest,
  CreateFamilyResponse,
  ListUserFamiliesResponse,
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
}
