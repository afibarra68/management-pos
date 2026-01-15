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
  private apiUrl = environment.apiAuthJwt; // Usa proxy en desarrollo (/mt-api) o URL directa en producción
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Limpia todos los datos de autenticación y usuario del almacenamiento
   */
  private clearAllAuthData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Limpiar localStorage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);

    // Limpiar sessionStorage por si acaso hay datos allí
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);

    // Limpiar cualquier otro dato relacionado con el usuario
    // Limpiar todas las claves que puedan contener datos del usuario
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('user') || key.includes('auth') || key.includes('token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limpiar sessionStorage de manera similar
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('user') || key.includes('auth') || key.includes('token'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const baseUrl = this.apiUrl;
    return this.http.post<LoginResponse>(`${baseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.jwt && this.isBrowser) {
            // Limpiar datos antiguos antes de guardar los nuevos
            this.clearAllAuthData();

            // Guardar el token JWT (siempre actualizar)
            localStorage.setItem(this.tokenKey, response.jwt);

            // Guardar los datos del usuario (siempre actualizar con todos los campos de la respuesta)
            const userData = {
              firstName: response.firstName || null,
              lastName: response.lastName || null,
              secondName: response.secondName || null,
              secondLastname: response.secondLastname || null,
              appUserId: response.appUserId || null,
              numberIdentity: response.numberIdentity || null,
              roles: response.roles || [],
              companyName: response.companyName || null,
              companyDescription: response.companyDescription || null,
              companyId: response.companyId || null,
              accessLevel: response.accessLevel || null,
              pwdMsgToExpire: response.pwdMsgToExpire || false
            };

            localStorage.setItem(this.userKey, JSON.stringify(userData));
          }
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    this.clearAllAuthData();
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



