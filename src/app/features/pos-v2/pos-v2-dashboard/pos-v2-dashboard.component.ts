import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';
import { ClosedTransactionService, ClosedTransactionStats, getParamsSessionKey } from '../../../core/services/closed-transaction.service';
import { ShiftService } from '../../../core/services/shift.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../environments/environment';
import { of, Subject } from 'rxjs';
import { switchMap, catchError, finalize, takeUntil } from 'rxjs/operators';
import {
  PosV2DashboardContentComponent,
  LiquidacionCajaData
} from './pos-v2-dashboard-content/pos-v2-dashboard-content.component';
import { CashRegister } from '../../../core/services/cash-register.service';
import { ParamVenta, ShiftConnectionHistory } from '../../../core/services/open-transaction.service';

@Component({
  selector: 'app-pos-v2-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, PosV2DashboardContentComponent],
  templateUrl: './pos-v2-dashboard.component.html',
  styleUrls: ['./pos-v2-dashboard.component.scss']
})
export class PosV2DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private closedTransactionService = inject(ClosedTransactionService);
  private shiftService = inject(ShiftService);
  private cashRegisterService = inject(CashRegisterService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  closingShift = false;
  loadingCash = false;
  mostrandoLiquidacion = false;
  liquidacionData: LiquidacionCajaData | null = null;
  historyIdForClose: number | null = null;
  /** True si se va a cerrar el turno antes del horario programado (para mostrar advertencia). */
  closingBeforeScheduledTime = false;

  /** Estadísticas del día (Total Operaciones). */
  stats: ClosedTransactionStats | null = null;
  /** Total en caja (efectivo inicial + total ingresos del turno). */
  totalCash = 0;
  /** Horario del turno actual para mostrar en la card Terminar turno (ej: "Turno tarde (02:00 PM - 10:00 PM)"). */
  shiftDisplayText = '';

  ngOnInit(): void {
    this.loadStats();
    this.loadCash();
    this.loadParamsForShift();
    window.addEventListener('cashRegisterUpdated', this.onCashRegisterUpdated);
    window.addEventListener('transactionClosed', this.onTransactionClosed);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('cashRegisterUpdated', this.onCashRegisterUpdated);
    window.removeEventListener('transactionClosed', this.onTransactionClosed);
  }

  private onTransactionClosed = (): void => {
    this.loadStats();
    this.loadCash();
  };

  private onCashRegisterUpdated = (event: Event): void => {
    const totalInCash = (event as CustomEvent).detail?.totalInCash ?? 0;
    this.totalCash = totalInCash;
  };

  private loadStats(): void {
    this.closedTransactionService.getTodayStats()
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe(data => {
        if (data) this.stats = data;
      });
  }

  private loadCash(): void {
    this.closedTransactionService.getParams(environment.serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const historyId = params?.dshiftConnectionHistory?.shiftConnectionHistoryId;
          if (!historyId) return of(null);
          return this.cashRegisterService.getCashInfoByShiftHistory(historyId);
        }),
        catchError(() => of(null))
      )
      .subscribe(data => {
        if (data) this.totalCash = (data.initialCash ?? 0) + (data.total ?? 0);
      });
  }

  private loadParamsForShift(): void {
    const key = getParamsSessionKey(environment.serviceCode);
    if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        try {
          const params = JSON.parse(cached) as ParamVenta;
          this.shiftDisplayText = this.getShiftDisplayTextFromParams(params);
          return;
        } catch {
          // invalid cache, fetch below
        }
      }
    }
    this.closedTransactionService.getParams(environment.serviceCode)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe(params => {
        this.shiftDisplayText = params ? this.getShiftDisplayTextFromParams(params) : '';
      });
  }

  private getShiftDisplayTextFromParams(params: ParamVenta): string {
    const shift = params?.dshiftConnectionHistory?.shift;
    if (!shift) return '';
    const shiftType = shift.shiftType as { typeName?: string; description?: string; startTime?: string; endTime?: string } | undefined;
    const typeName = shiftType?.typeName || shiftType?.description || 'Turno';
    const startTime = shift.startTime || shiftType?.startTime || '';
    const endTime = shift.endTime || shiftType?.endTime || '';
    if (startTime && endTime) return `${typeName} (${startTime} - ${endTime})`;
    if (startTime) return `${typeName} (${startTime})`;
    return typeName;
  }

  /**
   * Comprueba si la hora actual ya llegó o pasó la hora de fin del turno (validación local).
   * Si el backend devuelve canCloseShiftNow false por timezone o precisión, permitir cerrar cuando localmente ya es hora.
   */
  private isShiftEndTimeReached(params: ParamVenta): boolean {
    const history = params?.dshiftConnectionHistory;
    const shift = history?.shift;
    if (!shift) return false;
    const shiftType = shift.shiftType as { endTime?: string } | undefined;
    const endTimeStr = shift.endTime || shiftType?.endTime || '';
    if (!endTimeStr) return true;
    const actualShiftDate = history?.actualShiftDate;
    const dateStr = actualShiftDate ? String(actualShiftDate).trim() : '';
    const today = new Date();
    const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : today.getFullYear();
    const month = dateStr ? parseInt(dateStr.slice(5, 7), 10) - 1 : today.getMonth();
    const day = dateStr ? parseInt(dateStr.slice(8, 10), 10) : today.getDate();
    const parsed = this.parseTimeToMinutes(endTimeStr);
    if (parsed == null) return true;
    const [endHours, endMinutes] = parsed;
    const endDate = new Date(year, month, day, endHours, endMinutes, 59, 999);
    return today.getTime() >= endDate.getTime();
  }

  /** Parsea "22:00", "10:00 PM", "10:00:00 PM" a [hours, minutes] en 24h. */
  private parseTimeToMinutes(timeStr: string): [number, number] | null {
    const s = timeStr.trim();
    const match24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
    }
    const match12 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const pm = match12[4].toUpperCase() === 'PM';
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
    }
    return null;
  }

  formatCurrency(amount: number, currency?: string): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency || 'COP' }).format(amount ?? 0);
  }

  terminarTurno(): void {
    this.closedTransactionService.getParams(environment.serviceCode).pipe(
      switchMap(params => {
        const history = params?.dshiftConnectionHistory;
        const historyId = history?.shiftConnectionHistoryId;
        if (!historyId) {
          this.notificationService.warn('No hay un turno activo para terminar');
          return of(null);
        }
        if (params?.canCloseShiftNow === false && !this.isShiftEndTimeReached(params)) {
          this.notificationService.warn(
            'No se puede cerrar el turno antes de la hora de fin. Espere a que finalice el turno.'
          );
          return of(null);
        }
        this.loadingCash = true;
        return this.cashRegisterService.getCashInfoByShiftHistory(historyId).pipe(
          switchMap(data => of({ data, historyId, history, params }))
        );
      }),
      finalize(() => {
        this.loadingCash = false;
      }),
      catchError(() => {
        this.notificationService.error('Error al cargar la información de caja');
        return of(null);
      })
    ).subscribe({
      next: result => {
        if (result == null) return;
        const { data, historyId, history, params } = result;
        this.liquidacionData = {
          registers: data.registers,
          total: data.total,
          initialCash: data.initialCash,
          shiftInfo: this.buildShiftInfoForReport(history)
        };
        this.historyIdForClose = historyId;
        this.closingBeforeScheduledTime = !this.isShiftEndTimeReached(params);
        this.mostrandoLiquidacion = true;
      }
    });
  }

  confirmarCerrarTurno(): void {
    const id = this.historyIdForClose;
    if (id == null) {
      this.notificationService.warn('No hay turno para cerrar');
      return;
    }
    this.closingShift = true;
    this.shiftService.closeShiftHistory(id).pipe(
      finalize(() => { this.closingShift = false; }),
      catchError(() => {
        this.notificationService.error('Error al cerrar el turno');
        return of(null);
      })
    ).subscribe({
      next: result => {
        if (result != null) {
          const dataToReport = this.liquidacionData;
          this.notificationService.success('Turno terminado correctamente');
          this.mostrandoLiquidacion = false;
          this.liquidacionData = null;
          this.historyIdForClose = null;
          this.closingBeforeScheduledTime = false;
          window.dispatchEvent(new Event('shiftClosed'));
          if (dataToReport) {
            this.abrirReporteCierreTurno(dataToReport);
          }
          this.authService.logout();
        }
      }
    });
  }

  /**
   * Genera y abre el reporte de cierre de turno (liquidación de caja) en una ventana para imprimir/guardar como PDF.
   * Mismo enfoque que el admin: HTML + window.print(), sin librerías externas. Tamaño media carta.
   */
  private abrirReporteCierreTurno(data: LiquidacionCajaData): void {
    try {
      const html = this.generarReporteCierreTurnoHTML(data);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        this.notificationService.warn('Permite ventanas emergentes para generar el reporte PDF.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 300);
      };
      this.notificationService.success('Reporte listo. Usa Imprimir o Guardar como PDF.');
    } catch (e) {
      console.warn('Error al abrir reporte cierre turno', e);
    }
  }

  private getConceptDisplay(concept: CashRegister['concept']): string {
    if (!concept) return '-';
    if (typeof concept === 'string') return concept === 'VEHICLE_PAYMENT' ? 'Pago de vehículo' : concept;
    return (concept as { description?: string }).description || (concept as { id?: string }).id || '-';
  }

  private formatCurrencyReport(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
  }

  private formatDateReport(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CO');
  }

  /** Fecha/hora para el título del reporte (y nombre sugerido al guardar como PDF). Ej: 2025-02-03 14-30 */
  private getReportDateForFilename(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}-${min}`;
  }

  private buildShiftInfoForReport(history: ShiftConnectionHistory | undefined): LiquidacionCajaData['shiftInfo'] {
    if (!history) return undefined;
    const u = history.user;
    const sellerName = [u?.firstName, u?.secondName, u?.lastName, u?.secondLastName].filter(Boolean).join(' ').trim() || undefined;
    return {
      shiftTypeName: history.shift?.shiftType?.typeName,
      shiftDate: history.actualShiftDate ?? history.shift?.shiftDate,
      startTime: history.shift?.startTime,
      endTime: history.shift?.endTime,
      connectionTime: history.connectionTime,
      sellerName: sellerName || undefined
    };
  }

  private generarReporteCierreTurnoHTML(data: LiquidacionCajaData): string {
    const userData = this.authService.getUserData();
    const companyName = userData?.companyName || 'Empresa';
    const totalAEntregar = (data.initialCash || 0) + (data.total || 0);
    const primaryColor = '#5C1A1A';
    const primaryLight = '#7D2A2A';
    const shift = data.shiftInfo;

    const shiftRows = !shift ? '' : [
      shift.shiftTypeName != null && `<div class="info-row"><strong>Tipo de turno:</strong><span>${shift.shiftTypeName}</span></div>`,
      shift.shiftDate != null && `<div class="info-row"><strong>Fecha del turno:</strong><span>${shift.shiftDate}</span></div>`,
      (shift.startTime != null || shift.endTime != null) && `<div class="info-row"><strong>Horario:</strong><span>${shift.startTime ?? '-'} - ${shift.endTime ?? '-'}</span></div>`,
      shift.connectionTime != null && `<div class="info-row"><strong>Conexión (inicio):</strong><span>${this.formatDateReport(shift.connectionTime)}</span></div>`,
      shift.sellerName != null && `<div class="info-row"><strong>Vendedor:</strong><span>${(shift.sellerName || '').replace(/</g, '&lt;')}</span></div>`
    ].filter(Boolean).join('');

    const rows = (data.registers || []).map(r => `
      <tr>
        <td>${this.formatDateReport(r.registerDate || '')}</td>
        <td>${this.getConceptDisplay(r.concept)}</td>
        <td>${this.formatCurrencyReport(r.amount ?? 0)}</td>
        <td>${(r.notes || '-').replace(/</g, '&lt;')}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Cierre de Turno - Liquidación de Caja - ${this.getReportDateForFilename()}</title>
  <style>
    @media print {
      @page { margin: 1cm; size: 5.5in 8.5in; }
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      padding: 12px;
      color: #333;
      font-size: 11px;
    }
    .company-header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${primaryColor}; }
    .company-header .name { font-size: 16px; font-weight: bold; color: ${primaryColor}; margin: 0; }
    .header { text-align: center; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid ${primaryColor}; }
    .header h1 { margin: 0; color: ${primaryColor}; font-size: 16px; font-weight: 600; }
    .summary { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid ${primaryLight}; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .summary-row.total { font-weight: bold; border-top: 1px solid ${primaryColor}; padding-top: 6px; margin-top: 6px; font-size: 13px; }
    .info-section { background: #f8f9fa; padding: 8px 10px; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid ${primaryLight}; }
    .info-row { display: flex; margin-bottom: 3px; font-size: 10px; }
    .info-row strong { min-width: 120px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
    th { background: ${primaryColor}; color: white; padding: 6px 4px; text-align: left; font-weight: 600; }
    td { padding: 4px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #f8f9fa; }
    .footer { margin-top: 12px; text-align: center; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="company-header"><p class="name">${companyName}</p></div>
  <div class="header"><h1>Reporte Cierre de Turno - Liquidación de Caja</h1></div>
  ${shiftRows ? `<div class="info-section"><strong style="display:block;margin-bottom:4px">Información del turno</strong>${shiftRows}</div>` : ''}
  <div class="summary">
    <div class="summary-row"><span>Efectivo inicial</span><span>${this.formatCurrencyReport(data.initialCash || 0)}</span></div>
    <div class="summary-row"><span>Total ingresos</span><span>${this.formatCurrencyReport(data.total || 0)}</span></div>
    <div class="summary-row total"><span>Total a entregar</span><span>${this.formatCurrencyReport(totalAEntregar)}</span></div>
  </div>
  <table>
    <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Notas</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">Sin movimientos</td></tr>'}</tbody>
  </table>
  <div class="footer">Generado: ${new Date().toLocaleString('es-CO')}</div>
</body>
</html>`;
  }
}
