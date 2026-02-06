import { Routes } from '@angular/router';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';
import { authGuard } from './core/guards/auth.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { UnderConstructionComponent } from './features/under-construction/under-construction.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/pos',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [redirectIfAuthenticatedGuard],
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'pos',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadChildren: () => import('./features/pos/pos-module').then(m => m.PosModule),
  },
  {
    path: 'under-construction',
    component: UnderConstructionComponent
  },
  {
    path: '**',
    redirectTo: '/pos'
  }
];
