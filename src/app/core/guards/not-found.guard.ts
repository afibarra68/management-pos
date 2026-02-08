import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Guard para manejar rutas no encontradas (404)
 * Si el usuario está autenticado, redirige al POS por defecto (según environment.defaultPosPath)
 */
export const notFoundGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate([environment.defaultPosPath], { replaceUrl: true });
  } else {
    router.navigate(['/auth/login'], { replaceUrl: true });
  }

  return false;
};

