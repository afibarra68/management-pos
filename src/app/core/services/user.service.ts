import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface User {
  appUserId?: number;
  firstName?: string;
  secondName?: string;
  lastName?: string;
  secondLastname?: string;
  numberIdentity?: string;
  processorId?: string;
  sha?: string;
  salt?: string;
  accessCredential?: string;
  accessLevel?: string;
  companyCompanyId?: number;
  companyName?: string;
}

export interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  // Listar con paginación
  getPageable(
    page: number,
    size: number,
    filters?: { appUserId?: number; numberIdentity?: string; companyCompanyId?: number }
  ): Observable<UserPageResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.appUserId) {
      params = params.set('appUserId', filters.appUserId.toString());
    }
    if (filters?.numberIdentity) {
      params = params.set('numberIdentity', filters.numberIdentity);
    }
    if (filters?.companyCompanyId) {
      params = params.set('companyCompanyId', filters.companyCompanyId.toString());
    }

    return this.http.get<UserPageResponse>(`${this.apiUrl}/users/pageable`, { params });
  }

  // Crear
  create(user: User): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/create_public_user`, user);
  }

  // Eliminar
  delete(userDocument: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/down_public_user`, null, {
      params: new HttpParams().set('userDocument', userDocument.toString())
    });
  }
}
