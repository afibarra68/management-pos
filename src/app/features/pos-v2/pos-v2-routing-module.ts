import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosV2DashboardComponent } from './pos-v2-dashboard/pos-v2-dashboard.component';
import { PosV2LayoutComponent } from './pos-v2-layout/pos-v2-layout.component';
import { RegistrarPlacaComponent } from '../pos/registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from '../pos/registrar-salida/registrar-salida.component';
import { VehiculosParqueaderoComponent } from '../pos/vehiculos-parqueadero/vehiculos-parqueadero.component';

const routes: Routes = [
  {
    path: '',
    component: PosV2DashboardComponent
  },
  {
    path: 'ingresar-vehiculo',
    component: PosV2LayoutComponent,
    children: [{ path: '', component: RegistrarPlacaComponent }]
  },
  {
    path: 'registrar-salida',
    component: PosV2LayoutComponent,
    children: [{ path: '', component: RegistrarSalidaComponent }]
  },
  {
    path: 'vehiculos-parqueadero',
    component: PosV2LayoutComponent,
    children: [{ path: '', component: VehiculosParqueaderoComponent }]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosV2RoutingModule { }
