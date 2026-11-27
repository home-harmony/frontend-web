import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { APP_CONFIG } from '../../config/models/app-config';
import type { ListUserFamiliesResponse } from '../models/workspace';

@Injectable({ providedIn: 'root' })
export class WorkspaceApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiUrl.replace(/\/+$/, '');

  listUserFamilies(): Observable<ListUserFamiliesResponse> {
    return this.http.get<ListUserFamiliesResponse>(`${this.baseUrl}/profile/families`);
  }
}
