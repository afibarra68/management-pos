import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashInformativoRoutingModule } from './dash-informativo-routing.module';
import { DashInformativoLayoutComponent } from './dash-informativo-layout/dash-informativo-layout.component';
import { CartonAmericaComponent } from '../pos/carton-america/carton-america.component';
import { ChangePasswordComponent } from '../pos/change-password/change-password.component';
import { SalidaVehiculosComponent } from './salida-vehiculos/salida-vehiculos.component';

/**
 * Módulo raíz para la pantalla dash_informativo (roles GESTOR_EXTERNO_*).
 * Ruta desde la raíz: /dash_informativo (no pasa por POS).
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    DashInformativoRoutingModule,
    DashInformativoLayoutComponent,
    CartonAmericaComponent,
    ChangePasswordComponent,
    SalidaVehiculosComponent
  ],
  exports: []
})
export class DashInformativoModule {}
