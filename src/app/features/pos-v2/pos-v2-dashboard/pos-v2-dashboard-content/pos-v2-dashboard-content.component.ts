import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { CashRegister } from '../../../../core/services/cash-register.service';

/** Datos del turno para el reporte de cierre (impresión/PDF). */
export interface ShiftInfoForReport {
  shiftTypeName?: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  connectionTime?: string;
  sellerName?: string;
}

export interface LiquidacionCajaData {
  registers: CashRegister[];
  total: number;
  initialCash: number;
  /** Información del turno para incluir en el reporte de impresión/PDF. */
  shiftInfo?: ShiftInfoForReport;
}

@Component({
  selector: 'app-pos-v2-dashboard-content',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TableModule],
  templateUrl: './pos-v2-dashboard-content.component.html',
  styleUrls: ['./pos-v2-dashboard-content.component.scss']
})
export class PosV2DashboardContentComponent {
  @Input() mostrandoLiquidacion = false;
  @Input() liquidacionData: LiquidacionCajaData | null = null;
  @Input() closingShift = false;

  @Output() confirmarCerrarTurno = new EventEmitter<void>();

  get totalAEntregar(): number {
    const d = this.liquidacionData;
    return d ? (d.initialCash + d.total) : 0;
  }

  getConceptDisplay(concept: CashRegister['concept']): string {
    if (!concept) return '-';
    if (typeof concept === 'string') return concept === 'VEHICLE_PAYMENT' ? 'Pago de vehículo' : concept;
    return (concept as { description?: string; id?: string }).description || (concept as { id?: string }).id || '-';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CO');
  }

  onConfirmar(): void {
    this.confirmarCerrarTurno.emit();
  }
}
