import { inject } from '@angular/core';
import { Router, CanActivateChildFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Rutas POS que puede ver un usuario con solo rol GESTOR_EXTERNO_OBSERVE (ninguna; debe usar /consulta). */
const ALLOWED_PATHS_FOR_OBSERVER: string[] = [];

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
 * Guard para rutas hijas de /pos y /v2pos (control por roles).
 * Si el usuario tiene solo el rol GESTOR_EXTERNO_OBSERVE, solo puede acceder a dash_informativo (y cambio de contraseña).
 * Cualquier ruta POS o v2pos redirige a /dash_informativo.
 */
export const posObserverGuard: CanActivateChildFn = (childRoute, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.getUserData()?.roles ?? [];

  if (!isObserverOnly(roles)) {
    return true;
  }

  const path = childRoute.routeConfig?.path ?? '';
  if (ALLOWED_PATHS_FOR_OBSERVER.includes(path)) {
    return true;
  }

  router.navigate(['/dash_informativo'], { replaceUrl: true });
  return false;
};
