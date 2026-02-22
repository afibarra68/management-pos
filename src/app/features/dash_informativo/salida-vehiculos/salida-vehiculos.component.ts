import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ClosedTransactionService, ClosedTransaction } from '../../../core/services/closed-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-salida-vehiculos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule
  ],
  templateUrl: './salida-vehiculos.component.html',
  styleUrls: ['./salida-vehiculos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalidaVehiculosComponent implements OnInit {
  private closedTransactionService = inject(ClosedTransactionService);
  private authService = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  list = signal<ClosedTransaction[]>([]);
  totalRecords = signal(0);
  companyName = signal('');
  userName = signal('');
  selectedDate = signal<Date>(new Date());
  filterPlaca = signal('');
  currentPage = signal(0);
  /** Offset del paginador (first) para enlazar con p-table y evitar que onLazyLoad se dispare en bucle. */
  paginatorFirst = signal(0);
  readonly pageSize = 20;

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    this.companyName.set(userData?.companyName ?? userData?.companyDescription ?? '');
    this.userName.set(`${userData?.firstName ?? ''} ${userData?.lastName ?? ''}`.trim() || '—');
    this.load();
  }

  /** True si la empresa del usuario es Cartón América (para mostrar contexto en la descripción). */
  isCartonAmerica(): boolean {
    const name = (this.companyName() ?? '').toLowerCase();
    return name.includes('carton') && name.includes('america');
  }

  getDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  load(): void {
    const dateStr = this.getDateString(this.selectedDate());
    this.loading.set(true);
    this.error.set(null);
    const companyId = this.authService.getUserData()?.companyId ?? undefined;
    this.closedTransactionService
      .getByDateRange({
        endDateFrom: dateStr,
        endDateTo: dateStr,
        companyCompanyId: companyId,
        vehiclePlate: this.filterPlaca().trim() || undefined,
        consultCartonAmerica: true,
        page: this.currentPage(),
        size: this.pageSize
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: { content?: ClosedTransaction[]; totalElements?: number }) => {
          const content = res?.content ?? [];
          this.list.set(Array.isArray(content) ? content : []);
          this.totalRecords.set(res?.totalElements ?? 0);
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.message || 'Error al cargar salidas');
          this.list.set([]);
          this.totalRecords.set(0);
        }
      });
  }

  onDateChange(): void {
    this.currentPage.set(0);
    this.paginatorFirst.set(0);
    this.load();
  }

  /** Llamado cuando el usuario selecciona una fecha en el p-datePicker. */
  onDateSelect(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.onDateChange();
  }

  onFilterPlaca(): void {
    this.currentPage.set(0);
    this.paginatorFirst.set(0);
    this.load();
  }

  onPageChange(event: { first?: number; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    const requestedPage = rows ? Math.floor(first / rows) : 0;
    // Evitar bucle: solo cargar si la página pedida es distinta a la actual.
    if (requestedPage === this.currentPage() && this.list().length > 0) {
      return;
    }
    this.paginatorFirst.set(first);
    this.currentPage.set(requestedPage);
    this.load();
  }

  /** Acepta ISO, "yyyy-MM-dd HH:mm" o solo fecha/hora. */
  formatDateTime(val: string | undefined): string {
    if (val == null || String(val).trim() === '') return '—';
    const s = String(val).trim();
    try {
      const iso = s.includes('T') ? s : s.replace(' ', 'T');
      const d = new Date(iso);
      return isNaN(d.getTime()) ? s : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  /** Hora de llegada: startDay (YYYY-MM-DD) y startTime (p. ej. "02:30:00 PM" o "14:30:00"). */
  formatArrival(startDay: string | undefined, startTime: string | undefined): string {
    const day = (startDay != null ? String(startDay) : '').trim();
    const timeStr = (startTime != null ? String(startTime) : '').trim();
    if (!day && !timeStr) return '—';
    try {
      if (day && timeStr) {
        const time24 = this.parseTimeTo24(timeStr);
        const iso = time24 ? `${day}T${time24}` : `${day} ${timeStr}`;
        const d = new Date(iso.replace(' ', 'T'));
        return isNaN(d.getTime()) ? `${day} ${timeStr}` : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
      }
      if (day) {
        const d = new Date(day + 'T12:00:00');
        return isNaN(d.getTime()) ? day : d.toLocaleDateString('es-CO', { dateStyle: 'short' });
      }
      return timeStr;
    } catch {
      return [day, timeStr].filter(Boolean).join(' ') || '—';
    }
  }

  /** Tipo de vehículo: string o EnumResource (id, description). */
  formatTipoVehiculo(tipo: string | { id?: string; description?: string; key?: string } | undefined | null): string {
    if (tipo == null) return '—';
    if (typeof tipo === 'string') return tipo;
    const o = tipo as { id?: string; description?: string; key?: string };
    return o?.description ?? o?.key ?? o?.id ?? '—';
  }

  /** Convierte "hh:mm:ss a" (12h) a "HH:mm:ss" (24h); si ya es 24h lo devuelve tal cual. */
  private parseTimeTo24(timeStr: string): string | null {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!m) return timeStr.length >= 8 ? timeStr.substring(0, 8) : null;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const sec = (m[3] ?? '00');
    const ampm = (m[4] ?? '').toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}:${sec}`;
  }
}
