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
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { AuthService } from '../../../core/services/auth.service';
import { catchError, of, Subject, takeUntil, finalize, forkJoin } from 'rxjs';

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
  styleUrls: ['./pos-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosDashboardComponent implements OnInit, OnDestroy {
  private closedTransactionService = inject(ClosedTransactionService);
  private notificationService = inject(NotificationService);
  private shiftService = inject(ShiftService);
  private cashRegisterService = inject(CashRegisterService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  // Signals para mejor rendimiento y reactividad
  currentView = signal<ViewType>('dashboard');
  stats = signal<ClosedTransactionStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  totalCash = signal<number>(0); // Total en caja (efectivo inicial + total ingresos)
  
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
    // Escuchar eventos personalizados para recargar estadísticas y total en caja
    window.addEventListener('transactionClosed', () => {
      if (this.isDashboardView()) {
        this.loadStats();
        this.loadTotalCash();
      }
    });
    
    // Escuchar eventos de actualización de caja
    window.addEventListener('cashRegisterUpdated', () => {
      if (this.isDashboardView()) {
        this.loadTotalCash();
      }
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
    
    // Cargar total en caja
    this.loadTotalCash();
  }

  /**
   * Carga el total en caja del turno actual (efectivo inicial + total ingresos)
   */
  private loadTotalCash(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      this.totalCash.set(0);
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    this.shiftService.getByUserAndDate(userData.appUserId, today)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe({
        next: (assignments: DShiftAssignment[]) => {
          // Obtener el primer turno activo (CONFIRMED o PENDING) para hoy
          const activeShift = assignments.find(assignment => {
            const status = assignment.status;
            const statusId = typeof status === 'string' ? status : status?.id;
            return statusId === 'CONFIRMED' || statusId === 'PENDING';
          });

          if (!activeShift?.shiftAssignmentId) {
            this.totalCash.set(0);
            this.cdr.markForCheck();
            return;
          }

          // Obtener registros de caja y calcular total
          forkJoin({
            registers: this.cashRegisterService.getByShiftAssignment(activeShift.shiftAssignmentId),
            total: this.cashRegisterService.getTotalByShiftAssignment(activeShift.shiftAssignmentId)
          })
            .pipe(
              takeUntil(this.destroy$),
              catchError(() => of({ registers: [], total: 0 }))
            )
            .subscribe({
              next: ({ registers, total }) => {
                // Calcular efectivo inicial (primer registro con initialCash > 0)
                const firstRegister = registers?.find(r => r.initialCash && r.initialCash > 0);
                const initialCash = firstRegister?.initialCash || 0;
                
                // Total en caja = efectivo inicial + total ingresos
                const totalInCash = initialCash + (total || 0);
                this.totalCash.set(totalInCash);
                this.cdr.markForCheck();
              }
            });
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
}

