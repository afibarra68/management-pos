import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExternRoutingModule } from './extern-routing.module';
import { ExternLayoutComponent } from './extern-layout/extern-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';

/**
 * Módulo extern con enrutador alineado al principal (RouterModule.forChild, misma estructura de rutas).
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ExternRoutingModule,
    ExternLayoutComponent,
    CartonAmericaComponent,
    ChangePasswordComponent
  ],
  exports: []
})
export class ExternModule {}
