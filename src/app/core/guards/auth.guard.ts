import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  const isBrowser = isPlatformBrowser(platformId);
  const token = isBrowser && typeof localStorage !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;
  const currentUrl = state.url;

  // Si hay token, permitir acceso
  if (token) {
    return true;
  }

  // Si no hay token, redirigir al login preservando la URL actual
  const returnUrl = currentUrl;
  if (!returnUrl.startsWith('/auth/login') && returnUrl !== '/') {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: returnUrl },
      replaceUrl: true 
    });
  } else {
    router.navigate(['/auth/login'], { replaceUrl: true });
  }
  return false;
};

