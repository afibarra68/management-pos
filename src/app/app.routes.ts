import { Routes } from '@angular/router';
import { redirectIfAuthenticatedGuard } from './core/guards/redirect-if-authenticated.guard';
import { authGuard } from './core/guards/auth.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { posObserverGuard } from './core/guards/pos-observer.guard';
import { defaultRedirectGuard } from './core/guards/default-redirect.guard';
import { consultaAccessGuard } from './core/guards/consulta-access.guard';
import { UnderConstructionComponent } from './features/under-construction/under-construction.component';
import { environment } from './environments/environment';

const defaultPosPath = environment.defaultPosPath;

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [defaultRedirectGuard],
    component: UnderConstructionComponent
  },
  {
    path: 'auth',
    canActivate: [redirectIfAuthenticatedGuard],
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
  },
  /** Módulo desde la raíz solo para GESTOR_EXTERNO_OBSERVE: dash_informativo (no pasa por POS). */
  {
    path: 'dash_informativo',
    canActivate: [authGuard, mustChangePasswordGuard],
    canMatch: [consultaAccessGuard],
    loadChildren: () => import('./features/dash_informativo/dash-informativo.module').then(m => m.DashInformativoModule)
  },
  {
    path: 'pos',
    canActivate: [authGuard, mustChangePasswordGuard],
    canActivateChild: [posObserverGuard],
    loadChildren: () => import('./features/pos/pos-module').then(m => m.PosModule),
  },
  {
    path: 'v2pos',
    canActivate: [authGuard, mustChangePasswordGuard],
    canActivateChild: [posObserverGuard],
    loadChildren: () => import('./features/pos-v2/pos-v2-module').then(m => m.PosV2Module),
  },
  {
    path: 'under-construction',
    component: UnderConstructionComponent
  },
  {
    path: '**',
    redirectTo: defaultPosPath
  }
];
