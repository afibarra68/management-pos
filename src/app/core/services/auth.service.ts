import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  accesKey: string;
}

export interface LoginResponse {
  jwt: string;
  tokenType: string;
  firstName?: string;
  lastName: string;
  secondName: string;
  secondLastname: string;
  appUserId: number;
  numberIdentity?: string;
  roles: string[];
  companyName?: string;
  companyDescription?: string;
  companyId?: number;
  pwdMsgToExpire?: boolean;
  accessLevel?: string;
}

export interface CreateUserRequest {
  firstName: string;
  secondName: string;
  lastName: string;
  secondLastName?: string;
  numberIdentity: string;
  password: string;
  phoneNumber?: string;
}

export interface CreateUserResponse {
  appUserId: number;
  firstName: string;
  secondName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = environment.apiAuthJwt; // Usar proxy - redirige a http://localhost:9000
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const baseUrl = this.apiUrl;
    return this.http.post<LoginResponse>(`${baseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.jwt && this.isBrowser) {
            // Guardar el token JWT
            localStorage.setItem(this.tokenKey, response.jwt);
            // Guardar los datos del usuario
            localStorage.setItem(this.userKey, JSON.stringify({
              firstName: response.firstName,
              lastName: response.lastName,
              secondName: response.secondName,
              secondLastname: response.secondLastname,
              appUserId: response.appUserId,
              numberIdentity: response.numberIdentity,
              roles: response.roles,
              companyName: response.companyName,
              companyDescription: response.companyDescription,
              companyId: response.companyId
            }));
          }
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  getUserData(): any {
    if (!this.isBrowser) {
      return null;
    }
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const userData = this.getUserData();
    return userData?.roles?.includes(role) || false;
  }

  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${this.apiUrl}/users/create_public_user`, userData)
      .pipe(
        catchError(error => {
          console.error('Error al crear usuario:', error);
          return throwError(() => error);
        })
      );
  }
}



