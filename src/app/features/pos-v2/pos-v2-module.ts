import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosV2RoutingModule } from './pos-v2-routing-module';
import { PosV2DashboardComponent } from './pos-v2-dashboard/pos-v2-dashboard.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PosV2RoutingModule,
    PosV2DashboardComponent
  ],
  exports: []
})
export class PosV2Module { }
