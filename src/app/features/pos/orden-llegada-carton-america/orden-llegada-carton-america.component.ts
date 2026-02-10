import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { OpenTransactionService, CartonAmericaOrdenLlegada } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-orden-llegada-carton-america',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    DialogModule
  ],
  templateUrl: './orden-llegada-carton-america.component.html',
  styleUrls: ['./orden-llegada-carton-america.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdenLlegadaCartonAmericaComponent implements OnInit {
  private openTransactionService = inject(OpenTransactionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  list = signal<CartonAmericaOrdenLlegada[]>([]);
  /** Nombre de la empresa (usuario logueado). */
  companyName = signal<string>('');
  /** Cantidad total de vehículos (calculada a partir de la lista). */
  cantidad = signal<number>(0);

  showEditDialog = signal(false);
  editingRow = signal<CartonAmericaOrdenLlegada | null>(null);
  /** Valor para input datetime-local (YYYY-MM-DDTHH:mm) */
  editDateTimeValue = signal<string>('');

  ngOnInit(): void {
    this.loadCompanyInfo();
    this.load();
  }

  private loadCompanyInfo(): void {
    const userData = this.authService.getUserData();
    this.companyName.set(userData?.companyName ?? userData?.companyDescription ?? '');
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.openTransactionService.getCartonAmericaOrdenLlegada()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const arr = data ?? [];
          this.list.set(arr);
          this.cantidad.set(arr.length);
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.message || 'Error al cargar orden de llegada');
          this.list.set([]);
          this.cantidad.set(0);
        }
      });
  }

  formatDateTime(value: string | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  }

  /** Convierte operationDate (ISO) a valor para input datetime-local */
  toDateTimeLocal(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  openEditDialog(row: CartonAmericaOrdenLlegada): void {
    this.editingRow.set(row);
    this.editDateTimeValue.set(this.toDateTimeLocal(row.operationDate));
    this.showEditDialog.set(true);
  }

  closeEditDialog(): void {
    this.showEditDialog.set(false);
    this.editingRow.set(null);
  }

  /** Formato de fecha y hora local para el nombre del archivo al guardar (ej: 2025-02-08_14-30-00). */
  private getExportFileNameDateTime(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}_${h}-${min}-${s}`;
  }

  /** Exporta la lista actual a PDF (formato como administrativo: HTML + ventana de impresión). */
  exportToPdf(): void {
    const rows = this.list();
    if (rows.length === 0) {
      this.notificationService.warn('No hay datos para exportar', 'Advertencia');
      return;
    }
    try {
      const exportDateTime = this.getExportFileNameDateTime();
      const htmlContent = this.generateReportHTML(rows, exportDateTime);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        this.notificationService.error(
          'No se pudo abrir la ventana de impresión. Por favor, permite ventanas emergentes.',
          'Error'
        );
        return;
      }
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.document.title = `Orden-Llegada-Carton-America-${exportDateTime}`;
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 250);
      };
      this.notificationService.success('Reporte listo para imprimir/guardar como PDF', 'Éxito');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      this.notificationService.error('Error al generar el reporte', 'Error');
    }
  }

  /**
   * Genera el HTML del reporte (mismo formato que administrativo: company-header, header, info-section, tabla, footer).
   */
  private generateReportHTML(data: CartonAmericaOrdenLlegada[], dateTimeForTitle?: string): string {
    const companyName = this.companyName() || 'Empresa';
    const primaryColor = '#5C1A1A';
    const primaryLightColor = '#7D2A2A';
    const title = dateTimeForTitle
      ? `Orden-Llegada-Carton-America-${dateTimeForTitle}`
      : 'Cartón América - Orden de llegada';

    const tableRows = data
      .map(
        (row) => `
      <tr>
        <td><strong>${row.ordenDeLlegada ?? '-'}</strong></td>
        <td><strong>${row.vehiclePlate ?? '-'}</strong></td>
        <td>${row.tipoVehiculoLabel ?? '-'}</td>
        <td>${this.formatDateTime(row.operationDate)}</td>
        <td>${row.notes ?? '-'}</td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media print {
      @page {
        margin: 1cm;
        size: A4 landscape;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    .company-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid ${primaryColor};
    }
    .company-header .company-name {
      font-size: 20px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 0;
      margin-bottom: 5px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid ${primaryColor};
    }
    .header h1 {
      margin: 0;
      color: ${primaryColor};
      font-size: 24px;
      font-weight: 600;
    }
    .header .subtitle {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #555;
    }
    .info-section {
      margin-bottom: 25px;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid ${primaryLightColor};
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-row strong {
      min-width: 180px;
      color: #555;
    }
    .summary {
      background: linear-gradient(135deg, #e7f3ff 0%, #d0e7ff 100%);
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 25px;
      border-left: 4px solid ${primaryColor};
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .summary-item span:last-child {
      font-weight: bold;
      color: ${primaryColor};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 10px;
    }
    th {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLightColor} 100%);
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      border: 1px solid ${primaryColor};
    }
    td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    tr:hover {
      background-color: #e7f3ff;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="company-header">
    <p class="company-name">${companyName}</p>
  </div>

  <div class="header">
    <h1>Cartón América - Orden de llegada</h1>
    <p class="subtitle">Vehículos en parqueadero (camión, doble troque, tractomula) ordenados por fecha y hora de ingreso</p>
  </div>

  <div class="info-section">
    <div class="info-row">
      <strong>Total de vehículos:</strong>
      <span>${data.length}</span>
    </div>
    <div class="info-row">
      <strong>Fecha de generación:</strong>
      <span>${new Date().toLocaleString('es-ES')}</span>
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <span><strong>Total de registros:</strong></span>
      <span><strong>${data.length}</strong></span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Orden de llegada</th>
        <th>Placa</th>
        <th>Tipo de vehículo</th>
        <th>Fecha y hora de ingreso</th>
        <th>Datos informativos del vehículo</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado el ${new Date().toLocaleString('es-ES')} - ${companyName}</p>
  </div>
</body>
</html>
    `;
  }

  saveEditedDateTime(): void {
    const row = this.editingRow();
    const raw = this.editDateTimeValue();
    if (!row?.openTransactionId || !raw?.trim()) {
      return;
    }
    const d = new Date(raw);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const operationDate = `${y}-${m}-${day} ${h}:${min}`;

    this.saving.set(true);
    this.openTransactionService.updateFechaHoraIngreso({
      openTransactionId: row.openTransactionId,
      operationDate
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeEditDialog();
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.message || 'Error al actualizar fecha y hora');
        }
      });
  }
}
