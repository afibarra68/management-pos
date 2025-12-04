import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosDashboardComponent } from './pos-dashboard/pos-dashboard.component';
import { RegistrarPlacaComponent } from './registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from './registrar-salida/registrar-salida.component';
import { RegistrarClienteComponent } from './registrar-cliente/registrar-cliente.component';

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
    path: 'registrar-cliente',
    component: RegistrarClienteComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule { }

