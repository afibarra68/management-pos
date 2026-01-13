import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Guard que redirige a /pos si el usuario ya está autenticado
 * Útil para evitar que usuarios autenticados vean la página de login
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  // Solo verificar autenticación en el navegador
  const isBrowser = isPlatformBrowser(platformId);
  
  if (!isBrowser) {
    return true; // En SSR, permitir acceso
  }
  
  // Verificar si el usuario está autenticado
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    // Si tiene token, redirigir a /pos usando replaceUrl para evitar que aparezca en el historial
    router.navigate(['/pos'], { replaceUrl: true });
    return false; // No permitir acceso a la ruta actual
  }

  return true; // Permitir acceso si no está autenticado
};

