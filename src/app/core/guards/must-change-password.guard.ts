import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { RequirePasswordChangeService } from '../services/require-password-change.service';
import { AuthService } from '../services/auth.service';

/**
 * Guard que aplica la regla de "login por primera vez".
 * Si el usuario está autenticado y debe cambiar contraseña, solo puede estar en la ruta de cambio.
 * Cualquier otra ruta protegida redirige al componente de cambio de contraseña (no al dashboard).
 */
export const mustChangePasswordGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const requirePasswordChange = inject(RequirePasswordChangeService);
  const auth = inject(AuthService);

  if (!auth.isAuthenticated()) {
    return true; // authGuard se encarga de redirigir al login
  }

  if (!requirePasswordChange.requiresPasswordChange()) {
    return true; // No obligado a cambiar → permitir la ruta
  }

  if (requirePasswordChange.isChangePasswordRoute(state.url)) {
    return true; // Ya está en cambio de contraseña → permitir
  }

  router.navigate([requirePasswordChange.changePasswordRoute], {
    queryParams: { mustChange: 'true' },
    replaceUrl: true
  });
  return false;
};
