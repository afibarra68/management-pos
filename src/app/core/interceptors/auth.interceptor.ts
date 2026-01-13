import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';

// Flag para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

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
        // Excluir /auth/validate y /auth/login del manejo automático de 401
        const isValidateEndpoint = req.url.includes('/auth/validate');
        const isLoginEndpoint = req.url.includes('/auth/login');
        const currentPath = router.url;
        const isAlreadyOnLogin = currentPath.startsWith('/auth/login');
        
        // Si el error es 401 (No autorizado) y NO es el endpoint de validación/login
        if (error.status === 401 && !isValidateEndpoint && !isLoginEndpoint && !isRedirecting) {
          // Limpiar el token y redirigir al login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          
          isRedirecting = true;
          router.navigate(['/auth/login'], { replaceUrl: true }).then(() => {
            // Resetear el flag después de un breve delay
            setTimeout(() => {
              isRedirecting = false;
            }, 1000);
          });
        }
      }

      return throwError(() => error);
    })
  );
};

