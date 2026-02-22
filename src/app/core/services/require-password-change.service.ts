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

  /** Rutas del componente de cambio de contraseña (POS y dash_informativo). */
  readonly changePasswordRoutes = ['/pos/change-password', '/dash_informativo/change-password'] as const;

  private static readonly POS_FULL_ACCESS = ['PARKING_ATTENDANT', 'SUPER_USER', 'SUPER_ADMIN', 'ADMINISTRATOR_PRINCIPAL', 'ADMIN_APP', 'AUDIT_SELLER'];

  /** Ruta de cambio de contraseña según rol (gestor externo -> /consulta, resto -> /pos). */
  getChangePasswordRoute(): string {
    const roles = this.auth.getUserData()?.roles ?? [];
    const onlyObserver = roles.includes('GESTOR_EXTERNO_OBSERVE') && !roles.some((r: string) => RequirePasswordChangeService.POS_FULL_ACCESS.includes(r));
    return onlyObserver ? '/dash_informativo/change-password' : '/pos/change-password';
  }

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
    const path = url.split('?')[0].replace(/\/$/, '');
    return this.changePasswordRoutes.some(route => path === route || path === route + '/');
  }

  /**
   * Devuelve true si se debe mostrar solo la pantalla de cambio de contraseña (sin layout).
   */
  shouldShowOnlyChangePassword(url: string): boolean {
    return this.requiresPasswordChange() && this.isChangePasswordRoute(url);
  }
}
