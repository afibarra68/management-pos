import { Component, ViewEncapsulation, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { RegistrarPlacaComponent } from '../registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from '../registrar-salida/registrar-salida.component';
import { ParkingMapComponent } from '../parking-map/parking-map.component';
import { CashRegisterViewComponent } from '../cash-register-view/cash-register-view.component';
import { ClosedTransactionService, ClosedTransactionStats } from '../../../core/services/closed-transaction.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PrintService } from '../../../core/services/print.service';
import { ShiftService } from '../../../core/services/shift.service';
import { environment } from '../../../environments/environment';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil, finalize, switchMap } from 'rxjs/operators';

type ViewType = 'dashboard' | 'ingresar' | 'salida';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    RegistrarPlacaComponent,
    RegistrarSalidaComponent,
    ParkingMapComponent,
    CashRegisterViewComponent
  ],
  templateUrl: './pos-dashboard.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosDashboardComponent implements OnInit, OnDestroy {
  private closedTransactionService = inject(ClosedTransactionService);
  private notificationService = inject(NotificationService);
  private printService = inject(PrintService);
  private shiftService = inject(ShiftService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Signals para mejor rendimiento y reactividad
  currentView = signal<ViewType>('dashboard');
  stats = signal<ClosedTransactionStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCash = signal<number>(0); // Total en caja (efectivo inicial + total ingresos)
  reprintingId = signal<number | null>(null);
  closingShift = signal(false);

  // Computed signals para valores derivados
  hasStats = computed(() => this.stats() !== null);
  hasError = computed(() => this.error() !== null);
  isDashboardView = computed(() => this.currentView() === 'dashboard');

  ngOnInit(): void {
    this.loadStats();
    // Escuchar eventos de actualización desde otros componentes
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupEventListeners(): void {
    window.addEventListener('transactionClosed', () => {
      if (this.isDashboardView()) {
        this.loadStats();
      }
    });

    window.addEventListener('cashRegisterUpdated', (event: Event) => {
      const totalInCash = (event as CustomEvent).detail?.totalInCash ?? 0;
      this.totalCash.set(totalInCash);
      this.cdr.markForCheck();
    });
  }

  /**
   * Maneja errores de forma centralizada
   */
  private handleError(err: any): void {
    const status = err?.status;
    const errorResponse = err?.error;

    // Extraer el mensaje legible (readableMsg tiene prioridad)
    const errorMessage = errorResponse?.readableMsg || errorResponse?.message || errorResponse?.error || 'Error desconocido';

    if (status === 412) {
      const errorDetails = errorResponse?.details || errorResponse?.detail;
      this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
      this.error.set(errorMessage);
    } else {
      const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
      this.notificationService.error(errorMessage || genericMessage);
      this.error.set(errorMessage);
    }
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(null);

    this.closedTransactionService.getTodayStats()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
        catchError(err => {
          this.handleError(err);
          return of(null);
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            this.stats.set(data);
          }
        }
      });
  }

  formatCurrency(amount: number, currency?: string): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP'
    }).format(amount || 0);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  showIngresar(): void {
    this.currentView.set('ingresar');
  }

  showSalida(): void {
    this.currentView.set('salida');
  }

  showDashboard(): void {
    this.currentView.set('dashboard');
    this.loadStats();
  }

  /**
   * Cierra el turno activo del usuario (ShiftConnectionHistory).
   */
  terminarTurno(): void {
    this.closingShift.set(true);
    this.closedTransactionService.getParams(environment.serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const historyId = params?.dshiftConnectionHistory?.shiftConnectionHistoryId;
          if (!historyId) {
            this.notificationService.warn('No hay un turno activo para terminar');
            return of(null);
          }
          return this.shiftService.closeShiftHistory(historyId);
        }),
        finalize(() => {
          this.closingShift.set(false);
          this.cdr.markForCheck();
        }),
        catchError(err => {
          this.handleError(err);
          return of(null);
        })
      )
      .subscribe({
        next: (result) => {
          if (result != null) {
            this.notificationService.success('Turno terminado correctamente');
            this.loadStats();
            window.dispatchEvent(new Event('shiftClosed'));
          }
        }
      });
  }

  /**
   * Reimprime el ticket de una transacción cerrada: consulta al backend DDataPrinting (buildTicket)
   * y lo envía al servicio de impresión (parking-printing).
   * @param closedTransactionId ID de la transacción cerrada
   */
  reimprimirTicket(closedTransactionId: number): void {
    if (!closedTransactionId) {
      this.notificationService.error('ID de transacción inválido');
      return;
    }

    this.reprintingId.set(closedTransactionId);
    this.cdr.markForCheck();

    this.closedTransactionService.getReprintTicketData(closedTransactionId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        finalize(() => {
          this.reprintingId.set(null);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (buildTicket) => {
          if (!buildTicket?.template) {
            this.notificationService.error('No se recibieron datos de impresión');
            return;
          }
          this.printService.printTicket(buildTicket)
            .pipe(
              takeUntil(this.destroy$),
              catchError(printErr => {
                const msg = (printErr as { error?: string; message?: string })?.error
                  ?? (printErr as { message?: string })?.message
                  ?? 'Error al enviar a la impresora';
                this.notificationService.error(msg);
                return of(null);
              })
            )
            .subscribe({
              next: () => this.notificationService.success('Ticket reimpreso y enviado a la impresora correctamente')
            });
        }
      });
  }
}

