import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Guard que redirige al POS por defecto si el usuario ya está autenticado
 * (según environment.defaultPosPath: /pos o /v2pos)
 */
export const redirectIfAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const isBrowser = isPlatformBrowser(platformId);

  if (!isBrowser) {
    return true;
  }

  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    router.navigate([environment.defaultPosPath], { replaceUrl: true });
    return false;
  }

  return true;
};

