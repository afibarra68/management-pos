import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosV2DashboardComponent } from './pos-v2-dashboard/pos-v2-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: PosV2DashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosV2RoutingModule { }
