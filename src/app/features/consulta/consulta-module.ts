import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsultaRoutingModule } from './consulta-routing-module';
import { ConsultaLayoutComponent } from './consulta-layout/consulta-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ConsultaRoutingModule,
    ConsultaLayoutComponent,
    CartonAmericaComponent,
    ChangePasswordComponent
  ],
  exports: []
})
export class ConsultaModule {}
