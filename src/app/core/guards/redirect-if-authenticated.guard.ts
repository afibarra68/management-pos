import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que redirige a companies si el usuario ya está autenticado
 * Útil para evitar que usuarios autenticados vean la página de login
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Si tiene token, redirigir a companies
    router.navigate(['/pos']);
    return false; // No permitir acceso a la ruta actual
  }

  return true; // Permitir acceso si no está autenticado
};

