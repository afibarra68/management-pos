import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'auth/**',
    renderMode: RenderMode.Server
  },
  {
    // Las rutas de POS NO deben prerenderizarse porque requieren autenticación
    // del lado del cliente (localStorage). Se renderizan solo en el cliente.
    path: 'pos/**',
    renderMode: RenderMode.Client // Renderizar solo en el cliente, no en el servidor
  },
  {
    path: 'v2pos/**',
    renderMode: RenderMode.Client
  },
  {
    // Solo prerenderizar rutas públicas que no requieren autenticación
    // Las rutas protegidas se renderizan en el cliente
    path: '**',
    renderMode: RenderMode.Client // Cambiar a Client para evitar problemas con autenticación
  }
];
