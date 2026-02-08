import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Regla de negocio: "login por primera vez" / obligación de cambiar contraseña.
 * Centraliza la decisión y la ruta para mantener consistencia y orientación a objetos.
 */
@Injectable({
  providedIn: 'root'
})
export class RequirePasswordChangeService {
  private readonly auth = inject(AuthService);

  /** Ruta del componente de cambio de contraseña (pantalla completa, no modal). */
  readonly changePasswordRoute = '/pos/change-password' as const;

  /**
   * Indica si el usuario debe cambiar la contraseña antes de usar el dashboard.
   * Delegación al estado de autenticación (backend: mustChangePassword).
   */
  requiresPasswordChange(): boolean {
    return this.auth.mustChangePassword();
  }

  /**
   * Comprueba si la URL actual es la pantalla de cambio de contraseña obligatorio.
   */
  isChangePasswordRoute(url: string): boolean {
    const path = url.split('?')[0];
    return path === this.changePasswordRoute || path === this.changePasswordRoute + '/';
  }

  /**
   * Devuelve true si se debe mostrar solo la pantalla de cambio de contraseña (sin layout).
   */
  shouldShowOnlyChangePassword(url: string): boolean {
    return this.requiresPasswordChange() && this.isChangePasswordRoute(url);
  }
}
