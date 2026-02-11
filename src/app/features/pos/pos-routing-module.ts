import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosDashboardComponent } from './pos-dashboard/pos-dashboard.component';
import { RegistrarPlacaComponent } from './registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from './registrar-salida/registrar-salida.component';
import { ParkingMapComponent } from './parking-map/parking-map.component';
import { VehiculosParqueaderoComponent } from './vehiculos-parqueadero/vehiculos-parqueadero.component';
import { IngresoCajaOtroConceptoComponent } from './ingreso-caja-otro-concepto/ingreso-caja-otro-concepto.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { OrdenLlegadaCartonAmericaComponent } from './orden-llegada-carton-america/orden-llegada-carton-america.component';

const routes: Routes = [
  {
    path: '',
    component: PosDashboardComponent
  },
  {
    path: 'ingresar-vehiculo',
    component: RegistrarPlacaComponent
  },
  {
    path: 'registrar-salida',
    component: RegistrarSalidaComponent
  },
  {
    path: 'mapa-puestos',
    component: ParkingMapComponent
  },
  {
    path: 'vehiculos-parqueadero',
    component: VehiculosParqueaderoComponent
  },
  {
    path: 'ingreso-caja-otro-concepto',
    component: IngresoCajaOtroConceptoComponent
  },
  {
    path: 'orden-llegada-carton-america',
    component: OrdenLlegadaCartonAmericaComponent
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule { }

