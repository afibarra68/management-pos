import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { OpenTransactionService, OpenTransaction, ParamVenta } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { PrintService } from '../../../core/services/print.service';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehiculos-parqueadero',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputTextModule,
    TagModule
  ],
  templateUrl: './vehiculos-parqueadero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiculosParqueaderoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private openTransactionService = inject(OpenTransactionService);
  private closedTransactionService = inject(ClosedTransactionService);
  private printService = inject(PrintService);
  private authService = inject(AuthService);
  private enumService = inject(EnumService);
  private shiftService = inject(ShiftService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  /** Contenido de la página actual (paginación lazy como en t-parking). */
  filteredVehicles = signal<OpenTransaction[]>([]);
  /** Total de registros devuelto por el backend (para el paginador). */
  totalRecords = signal(0);
  searchTerm = signal<string>('');
  currentShift = signal<DShiftAssignment | null>(null);
  reprintingId = signal<number | null>(null);
  paginatorFirst = signal(0);
  paginatorRows = signal(10);
  private searchTerm$ = new Subject<string>();

  sellerId = computed(() => {
    const userData = this.authService.getUserData();
    return userData?.appUserId || null;
  });

  ngOnInit(): void {
    this.loadCurrentShift();
    this.setupSearchDebounce();
    this.loadPage(0, this.paginatorRows());
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchTerm$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.paginatorFirst.set(0);
        this.loadPage(0, this.paginatorRows());
      });
  }

  private setupEventListeners(): void {
    window.addEventListener('vehicleRegistered', () => {
      this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
    });
    window.addEventListener('transactionClosed', () => {
      this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
    });
  }

  private loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    // Obtener información del turno activo desde params
    const serviceCode = environment.serviceCode;
    this.closedTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          const shiftHistory = params?.dshiftConnectionHistory;
          const shift = shiftHistory?.shift;
          if (shift && shiftHistory?.shiftAssignmentId) {
            const shiftAssignment: DShiftAssignment = {
              shiftAssignmentId: shiftHistory.shiftAssignmentId,
              shiftId: shiftHistory.shiftId || shift.shiftId,
              shift: shift,
              appUserId: shiftHistory.appUserId,
              status: shift.status || { id: 'CONFIRMED', description: 'Turno confirmado' }
            };
            this.currentShift.set(shiftAssignment);
          } else {
            this.currentShift.set(null);
          }
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Carga una página desde el backend (paginación lazy como en t-parking).
   * Actualiza filteredVehicles con content y totalRecords con totalElements.
   */
  loadPage(page: number, size: number): void {
    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;

    if (!companyId) {
      this.error.set('No se pudo obtener la información de la empresa');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const plateFilter = this.searchTerm().trim() || undefined;

    this.openTransactionService
      .getPage({ companyId, page, size, vehiclePlate: plateFilter })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err: any) => {
          const errorResponse = err?.error;
          this.error.set(errorResponse?.readableMsg || errorResponse?.message || 'Error al cargar vehículos');
          this.filteredVehicles.set([]);
          this.totalRecords.set(0);
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (!response) return;
          const content = response.content || [];
          const total = response.totalElements ?? 0;
          this.filteredVehicles.set(content);
          this.totalRecords.set(total);
          this.paginatorFirst.set(page * size);
          this.paginatorRows.set(size);
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.searchTerm$.next(target.value);
  }

  onLazyLoad(event: { first?: number | null; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.paginatorRows();
    const page = Math.floor(first / rows);
    if (this.paginatorFirst() !== first || this.paginatorRows() !== rows) {
      this.loadPage(page, rows);
    }
  }

  refresh(): void {
    this.paginatorFirst.set(0);
    this.loadPage(0, this.paginatorRows());
  }

  /**
   * Reimprime la tirilla de ingreso del vehículo: consulta al backend la data actual,
   * genera DDataPrinting (buildTicket) y la envía al servicio de impresión (parking-printing).
   */
  reprintTicket(vehicle: OpenTransaction): void {
    const id = vehicle.openTransactionId;
    if (id == null) {
      this.error.set('No se puede reimprimir: ID de transacción no disponible');
      this.cdr.markForCheck();
      return;
    }
    this.reprintingId.set(id);
    this.error.set(null);
    this.cdr.markForCheck();

    this.openTransactionService.getReprintTicketData(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.reprintingId.set(null);
          this.cdr.markForCheck();
        }),
        catchError((err: unknown) => {
          const msg = (err as { error?: { message?: string; readableMsg?: string } })?.error?.readableMsg
            ?? (err as { error?: { message?: string } })?.error?.message
            ?? 'Error al obtener datos para reimprimir';
          this.error.set(msg);
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe({
        next: (buildTicket) => {
          if (!buildTicket?.template) {
            this.error.set('No se recibieron datos de impresión');
            this.cdr.markForCheck();
            return;
          }
          this.printService.printTicket(buildTicket)
            .pipe(
              takeUntil(this.destroy$),
              catchError((printErr: unknown) => {
                const printMsg = (printErr as { error?: string; message?: string })?.error
                  ?? (printErr as { message?: string })?.message
                  ?? 'Error al enviar a la impresora';
                this.error.set(printMsg);
                this.cdr.markForCheck();
                return of(null);
              })
            )
            .subscribe({
              next: () => {
                this.error.set(null);
                this.cdr.markForCheck();
              }
            });
        }
      });
  }

  getVehicleTypeDisplay(enumResource: EnumResource | string | null | undefined): string {
    if (!enumResource) return 'Desconocido';
    if (typeof enumResource === 'string') return enumResource;
    return enumResource.description || enumResource.id || 'Desconocido';
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return 'N/A';

    // Si ya viene formateado como hora (ej: "10:53:52 PM" o "22:53:52")
    if (timeString.includes(':') && !timeString.includes('T') && !timeString.includes('-')) {
      // Ya es una hora formateada, devolverla tal cual o formatearla mejor
      return timeString;
    }

    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        // Si no es una fecha válida, devolver el string original
        return timeString;
      }
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  getTimeElapsed(vehicle: OpenTransaction): string {
    if (!vehicle.startTime) return 'N/A';

    try {
      let startDateTime: Date;
      const startTime = vehicle.startTime;
      const startDay = vehicle.startDay || vehicle.operationDate;

      // Si tenemos fecha y hora, combinarlas
      if (startDay) {
        // Intentar parsear la fecha
        let datePart: Date;
        try {
          datePart = new Date(startDay);
          if (isNaN(datePart.getTime())) {
            // Si no es una fecha válida, intentar parsear manualmente
            const dateMatch = startDay.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              datePart = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
            } else {
              datePart = new Date();
            }
          }
        } catch {
          datePart = new Date();
        }

        // Parsear la hora
        const timeParts = startTime.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const seconds = parseInt(timeParts[3]);
          const ampm = timeParts[4];

          // Convertir a formato 24 horas si es necesario
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours !== 12) {
              hours += 12;
            } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
              hours = 0;
            }
          }

          startDateTime = new Date(datePart);
          startDateTime.setHours(hours, minutes, seconds, 0);
        } else {
          // Si no se puede parsear la hora, usar solo la fecha
          startDateTime = datePart;
        }
      } else {
        // Si no hay fecha, intentar parsear startTime como fecha completa
        startDateTime = new Date(startTime);
        if (isNaN(startDateTime.getTime())) {
          return 'N/A';
        }
      }

      const now = new Date();
      const diff = now.getTime() - startDateTime.getTime();

      if (diff < 0) {
        return 'N/A';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch {
      return 'N/A';
    }
  }

  getShiftDisplayText(): string {
    const shiftAssignment = this.currentShift();
    if (!shiftAssignment?.shift) {
      return 'Sin turno asignado';
    }

    const shift = shiftAssignment.shift;
    const shiftType = shift.shiftType;
    const typeName = shiftType?.typeName || shiftType?.description || 'Turno';
    const startTime = shift.startTime || shiftType?.startTime || '';
    const endTime = shift.endTime || shiftType?.endTime || '';

    if (startTime && endTime) {
      return `${typeName} (${startTime} - ${endTime})`;
    } else if (startTime) {
      return `${typeName} (${startTime})`;
    }

    return typeName;
  }
}
