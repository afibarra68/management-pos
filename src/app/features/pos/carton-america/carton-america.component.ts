import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { OpenTransactionService, CartonAmericaOrdenLlegada } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-carton-america',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './carton-america.component.html',
  styleUrls: ['./carton-america.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartonAmericaComponent implements OnInit {
  private openTransactionService = inject(OpenTransactionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private pdfExportService = inject(PdfExportService);

  loading = signal(false);
  error = signal<string | null>(null);
  list = signal<CartonAmericaOrdenLlegada[]>([]);
  companyName = signal<string>('');
  cantidad = signal<number>(0);
  /** Nombre del usuario actual para la barra de datos */
  userName = signal<string>('');
  /** Filtro por placa (solo frontend) */
  filterPlaca = signal<string>('');

  /** Lista filtrada por placa en el frontend */
  filteredList = computed(() => {
    const q = this.filterPlaca().trim().toLowerCase();
    const arr = this.list();
    if (!q) return arr;
    return arr.filter(row => (row.vehiclePlate ?? '').toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadCompanyInfo();
    this.load();
  }

  private loadCompanyInfo(): void {
    const userData = this.authService.getUserData();
    this.companyName.set(userData?.companyName ?? userData?.companyDescription ?? '');
    const first = userData?.firstName ?? '';
    const last = userData?.lastName ?? '';
    this.userName.set(`${first} ${last}`.trim() || '—');
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
          this.error.set(err?.error?.message || err?.message || 'Error al cargar Carton America');
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

  exportToPdf(): void {
    const rows = this.filteredList();
    if (rows.length === 0) {
      this.notificationService.warn('No hay datos para exportar', 'Advertencia');
      return;
    }
    try {
      const data = rows.map(row => ({
        ordenDeLlegada: row.ordenDeLlegada,
        vehiclePlate: row.vehiclePlate ?? '-',
        tipoVehiculoLabel: row.tipoVehiculoLabel ?? '-',
        operationDate: row.operationDate,
        notes: row.notes ?? '-'
      }));
      this.pdfExportService.export({
        title: 'Carton America - Acceso cliente',
        subtitle: 'Vehículos en parqueadero ordenados por fecha y hora de ingreso',
        companyName: this.companyName() || undefined,
        columns: [
          { header: 'Orden de llegada', dataKey: 'ordenDeLlegada' },
          { header: 'Placa', dataKey: 'vehiclePlate' },
          { header: 'Tipo de vehículo', dataKey: 'tipoVehiculoLabel' },
          { header: 'Fecha y hora de ingreso', dataKey: 'operationDate', format: v => PdfExportService.formatDateTime(v as string) },
          { header: 'Datos informativos del vehículo', dataKey: 'notes' }
        ],
        data,
        filename: PdfExportService.getExportFileName('Carton-America'),
        primaryColor: '#0d47a1'
      });
      this.notificationService.success('PDF exportado correctamente', 'Éxito');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      this.notificationService.error('Error al generar el PDF', 'Error');
    }
  }
}
