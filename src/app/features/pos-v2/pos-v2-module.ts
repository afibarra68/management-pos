import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosV2RoutingModule } from './pos-v2-routing-module';
import { PosV2DashboardComponent } from './pos-v2-dashboard/pos-v2-dashboard.component';
import { PosV2LayoutComponent } from './pos-v2-layout/pos-v2-layout.component';
import { RegistrarPlacaComponent } from '../pos/registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from '../pos/registrar-salida/registrar-salida.component';
import { VehiculosParqueaderoComponent } from '../pos/vehiculos-parqueadero/vehiculos-parqueadero.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PosV2RoutingModule,
    PosV2DashboardComponent,
    PosV2LayoutComponent,
    RegistrarPlacaComponent,
    RegistrarSalidaComponent,
    VehiculosParqueaderoComponent
  ],
  exports: []
})
export class PosV2Module { }
