import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashInformativoLayoutComponent } from './dash-informativo-layout/dash-informativo-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';
import { SalidaVehiculosComponent } from './salida-vehiculos/salida-vehiculos.component';
import { gestorExitsAccessGuard } from '../../core/guards/gestor-exits-access.guard';

const routes: Routes = [
  {
    path: '',
    component: DashInformativoLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'carton-america'
      },
      {
        path: 'carton-america',
        component: CartonAmericaComponent
      },
      {
        path: 'change-password',
        component: ChangePasswordComponent
      },
      {
        path: 'salida-vehiculos',
        component: SalidaVehiculosComponent,
        canActivate: [gestorExitsAccessGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashInformativoRoutingModule {}
