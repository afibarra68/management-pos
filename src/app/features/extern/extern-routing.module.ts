import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExternLayoutComponent } from './extern-layout/extern-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';

/**
 * Enrutador del módulo extern (alineado al enrutador principal).
 * Misma estructura: path '', layout con children, RouterModule.forChild, export.
 */
const routes: Routes = [
  {
    path: '',
    component: ExternLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: CartonAmericaComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExternRoutingModule { }
