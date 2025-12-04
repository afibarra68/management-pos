import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosRoutingModule } from './pos-routing-module';
import { PosDashboardComponent } from './pos-dashboard/pos-dashboard.component';
import { RegistrarPlacaComponent } from './registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from './registrar-salida/registrar-salida.component';
import { RegistrarClienteComponent } from './registrar-cliente/registrar-cliente.component';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PosRoutingModule,
    PosDashboardComponent,
    RegistrarPlacaComponent,
    RegistrarSalidaComponent,
    RegistrarClienteComponent,
    SharedModule
  ],
  exports: [
    SharedModule
  ]
})
export class PosModule { }

