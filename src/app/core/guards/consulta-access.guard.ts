import { inject } from '@angular/core';
import { Router, CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/** Roles que pueden acceder al módulo dash_informativo (clientes / gestores). */
const DASH_INFORMATIVO_ROLES = ['GESTOR_EXTERNO_OBSERVE', 'GESTOR_EXTERNO_EDIT', 'GESTOR_EXTERNO_EXITS'] as const;

/**
 * Permite cargar el módulo /dash_informativo si el usuario tiene alguno de los roles de gestor/cliente.
 * Si no tiene ninguno, redirige al POS por defecto.
 */
export const consultaAccessGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.getUserData()?.roles ?? [];

  if (roles.some((r: string) => (DASH_INFORMATIVO_ROLES as readonly string[]).includes(r))) {
    return true;
  }
  const defaultPath = environment?.defaultPosPath ?? '/pos';
  router.navigate([defaultPath], { replaceUrl: true });
  return false;
};

