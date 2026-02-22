import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Roles que pueden acceder a "Visualizar salida de vehículos" (salida-vehiculos). */
const GESTOR_EXITS_ROLES = ['GESTOR_EXTERNO_EDIT', 'GESTOR_EXTERNO_EXITS'] as const;

/**
 * Permite acceder a la ruta solo si el usuario tiene GESTOR_EXTERNO_EDIT o GESTOR_EXTERNO_EXITS.
 * Si no, redirige a la raíz de dash_informativo.
 */
export const gestorExitsAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.getUserData()?.roles ?? [];

  if (roles.some((r: string) => (GESTOR_EXITS_ROLES as readonly string[]).includes(r))) {
    return true;
  }
  router.navigate(['/dash_informativo'], { replaceUrl: true });
  return false;
};
