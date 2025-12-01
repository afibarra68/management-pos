import { Routes } from '@angular/router';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [redirectIfAuthenticatedGuard],
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'auth',
    canActivate: [redirectIfAuthenticatedGuard],
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'pos',
    canActivate: [authGuard],
    loadChildren: () => import('./features/pos/pos-module').then(m => m.PosModule),
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
