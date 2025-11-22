import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No agregar token a las peticiones de login (públicas)
  if (req.url.includes('/auth/login') || req.url.includes('/users/create_public_user')) {
    return next(req);
  }

  // Solo agregar token a peticiones que van al API (y no son públicas)
  if (req.url.startsWith('/api')) {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(cloned);
    }
  }
  
  return next(req);
};

