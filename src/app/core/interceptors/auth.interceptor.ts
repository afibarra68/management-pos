import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  // Verificar si estamos en el navegador antes de usar localStorage
  const isBrowser = isPlatformBrowser(platformId);
  const token = isBrowser ? localStorage.getItem('auth_token') : null;

  // Clonar la petición y agregar el header de autorización si existe el token
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Ejecutar la petición y manejar errores
  return next(authReq).pipe(
    catchError((error) => {
      // Solo manejar errores en el navegador
      if (isBrowser) {
        // Si el error es 401 (No autorizado), redirigir al login
        if (error.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          router.navigate(['/auth/login']);
        }
      }

      return throwError(() => error);
    })
  );
};

