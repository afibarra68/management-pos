import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { RegistrarPlacaComponent } from '../registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from '../registrar-salida/registrar-salida.component';

type ViewType = 'dashboard' | 'ingresar' | 'salida';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    RegistrarPlacaComponent,
    RegistrarSalidaComponent
  ],
  templateUrl: './pos-dashboard.component.html',
  styleUrls: ['./pos-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PosDashboardComponent {
  currentView: ViewType = 'dashboard';

  showIngresar(): void {
    this.currentView = 'ingresar';
  }

  showSalida(): void {
    this.currentView = 'salida';
  }

  showDashboard(): void {
    this.currentView = 'dashboard';
  }
}

