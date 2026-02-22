import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsultaLayoutComponent } from './consulta-layout/consulta-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';

const routes: Routes = [
  {
    path: '',
    component: ConsultaLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dash_informativo'
      },
      {
        path: 'dash_informativo',
        component: CartonAmericaComponent
      },
      {
        path: 'change-password',
        component: ChangePasswordComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsultaRoutingModule {}
