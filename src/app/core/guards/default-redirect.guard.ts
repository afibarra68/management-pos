import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

const POS_FULL_ACCESS_ROLES = [
  'PARKING_ATTENDANT',
  'SUPER_USER',
  'SUPER_ADMIN',
  'ADMINISTRATOR_PRINCIPAL',
  'ADMIN_APP',
  'AUDIT_SELLER'
];

function isObserverOnly(roles: string[]): boolean {
  if (!roles?.includes('GESTOR_EXTERNO_OBSERVE')) return false;
  return !roles.some(r => POS_FULL_ACCESS_ROLES.includes(r));
}

/**
 * Redirige la ruta raíz '' según el rol del usuario:
 * - No autenticado -> /auth/login
 * - Solo GESTOR_EXTERNO_OBSERVE -> /consulta/dash_informativo
 * - Resto -> defaultPosPath (/pos o /v2pos)
 */
export const defaultRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }
  const roles = auth.getUserData()?.roles ?? [];
  if (isObserverOnly(roles)) {
    return router.createUrlTree(['/dash_informativo']);
  }
  return router.createUrlTree([environment.defaultPosPath]);
};
