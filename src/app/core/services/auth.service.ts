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
   * Limpia todas las claves de un storage que coincidan con los patrones especificados
   */
  private clearStorageByPattern(storage: Storage, patterns: string[]): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && patterns.some(pattern => key.includes(pattern))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  }

  /**
   * Limpia todos los datos de autenticación y usuario del almacenamiento
   */
  private clearAllAuthData(): void {
    if (!this.isBrowser) {
      return;
    }

    const authPatterns = ['user', 'auth', 'token'];
    
    // Limpiar claves específicas primero
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);

    // Limpiar cualquier otro dato relacionado con el usuario usando patrones
    this.clearStorageByPattern(localStorage, authPatterns);
    this.clearStorageByPattern(sessionStorage, authPatterns);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const baseUrl = this.apiUrl;
    // Usar el endpoint login-sell que solo permite usuarios con rol PARKING_ATTENDANT (CAJERO)
    return this.http.post<LoginResponse>(`${baseUrl}/auth/login-sell`, credentials)
      .pipe(
        tap(response => {
          if (response.jwt && this.isBrowser) {
            // Limpiar datos antiguos antes de guardar los nuevos
            this.clearAllAuthData();

            // Guardar el token JWT
            localStorage.setItem(this.tokenKey, response.jwt);

            // Guardar los datos del usuario de forma optimizada
            const userData = {
              firstName: response.firstName ?? null,
              lastName: response.lastName ?? null,
              secondName: response.secondName ?? null,
              secondLastname: response.secondLastname ?? null,
              appUserId: response.appUserId ?? null,
              numberIdentity: response.numberIdentity ?? null,
              roles: response.roles ?? [],
              companyName: response.companyName ?? null,
              companyDescription: response.companyDescription ?? null,
              companyId: response.companyId ?? null,
              accessLevel: response.accessLevel ?? null,
              pwdMsgToExpire: response.pwdMsgToExpire ?? false
            };

            localStorage.setItem(this.userKey, JSON.stringify(userData));
          }
        }),
        catchError(error => {
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
          return throwError(() => error);
        })
      );
  }
}



