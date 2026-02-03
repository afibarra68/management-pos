import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { CashRegisterService, CashRegister } from '../../../core/services/cash-register.service';
import { ShiftService, DShiftAssignment, ShiftConnectionHistory } from '../../../core/services/shift.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { Subject, forkJoin, takeUntil, finalize, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CashRegisterSummary {
  concept: string;
  conceptDisplay: string;
  totalAmount: number;
  count: number;
}

@Component({
  selector: 'app-cash-register-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    MessageModule
  ],
  templateUrl: './cash-register-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashRegisterViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cashRegisterService = inject(CashRegisterService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private closedTransactionService = inject(ClosedTransactionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  currentShift = signal<DShiftAssignment | null>(null);
  activeShiftHistory = signal<ShiftConnectionHistory | null>(null);
  cashRegisters = signal<CashRegister[]>([]);
  summaryByConcept = signal<CashRegisterSummary[]>([]);
  totalAmount = signal(0);
  initialCash = signal(0);

  ngOnInit(): void {
    this.loadCurrentShift();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupEventListeners(): void {
    window.addEventListener('vehicleRegistered', () => {
      if (this.activeShiftHistory()?.shiftConnectionHistoryId) {
        this.loadCashRegisters();
      }
    });

    window.addEventListener('transactionClosed', () => {
      if (this.activeShiftHistory()?.shiftConnectionHistoryId) {
        this.loadCashRegisters();
      }
    });
  }

  private loadCurrentShift(): void {
    const user = this.authService.getUserData();
    if (!user || !user.appUserId) {
      this.error.set('Usuario no autenticado');
      return;
    }

    this.loading.set(true);

    // Obtener configuración con información del turno desde params
    const serviceCode = environment.serviceCode;

    this.closedTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError(err => {
          this.error.set('Error al cargar la configuración del turno');
          return of(null);
        })
      )
      .subscribe({
        next: (params) => {
          if (!params || !params.dshiftConnectionHistory) {
            this.currentShift.set(null);
            this.activeShiftHistory.set(null);
            this.error.set('No hay un turno activo');
            return;
          }

          const shiftHistory = params.dshiftConnectionHistory;

          // Establecer el histórico de turno activo (convertir al tipo esperado)
          const shiftHistoryForComponent: ShiftConnectionHistory = {
            ...shiftHistory,
            closedBy: shiftHistory.closedBy ? {
              appUserId: shiftHistory.closedBy.appUserId,
              firstName: shiftHistory.closedBy.firstName,
              secondName: undefined, // No está disponible en el tipo de origen
              lastName: shiftHistory.closedBy.lastName
            } : undefined // Convertir null a undefined
          };
          this.activeShiftHistory.set(shiftHistoryForComponent);

          // Construir DShiftAssignment a partir de la información del turno
          if (shiftHistory.shift && shiftHistory.shiftAssignmentId) {
            const shiftAssignment: DShiftAssignment = {
              shiftAssignmentId: shiftHistory.shiftAssignmentId,
              shiftId: shiftHistory.shiftId || shiftHistory.shift.shiftId,
              shift: shiftHistory.shift,
              appUserId: shiftHistory.appUserId,
              status: shiftHistory.shift.status || { id: 'CONFIRMED', description: 'Turno confirmado' }
            };

            this.currentShift.set(shiftAssignment);

            // El backend validará si se puede cerrar el turno cuando se intente cerrar
            this.loadCashRegisters();
          } else {
            this.currentShift.set(null);
            this.error.set('Información del turno incompleta');
          }
        }
      });
  }

  private loadCashRegisters(): void {
    const id = this.activeShiftHistory()?.shiftConnectionHistoryId;
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      registers: this.cashRegisterService.getByShiftConnectionHistory(id),
      total: this.cashRegisterService.getTotalByShiftConnectionHistory(id)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError(err => {
          this.error.set('Error al cargar los registros de caja');
          return of({ registers: [], total: 0 });
        })
      )
      .subscribe({
        next: ({ registers, total }) => {
          this.cashRegisters.set(registers || []);
          this.totalAmount.set(total || 0);

          // Calcular efectivo inicial (primer registro con initialCash > 0)
          const firstRegister = registers?.find(r => r.initialCash && r.initialCash > 0);
          this.initialCash.set(firstRegister?.initialCash || 0);

          // Calcular resumen por concepto
          const summaryMap = new Map<string, CashRegisterSummary>();

          (registers || []).forEach(register => {
            if (register.concept && register.amount && register.amount > 0) {
              const conceptId = typeof register.concept === 'string'
                ? register.concept
                : register.concept.id || '';

              const conceptDisplay = typeof register.concept === 'string'
                ? (register.concept === 'VEHICLE_PAYMENT' ? 'Pago de Vehículo' : register.concept)
                : (register.concept.description || register.concept.id || '');

              if (!summaryMap.has(conceptId)) {
                summaryMap.set(conceptId, {
                  concept: conceptId,
                  conceptDisplay,
                  totalAmount: 0,
                  count: 0
                });
              }

              const summary = summaryMap.get(conceptId)!;
              summary.totalAmount += register.amount || 0;
              summary.count += 1;
            }
          });

          this.summaryByConcept.set(Array.from(summaryMap.values()));

          const totalInCash = (firstRegister?.initialCash || 0) + (total || 0);
          window.dispatchEvent(new CustomEvent('cashRegisterUpdated', { detail: { totalInCash } }));
        }
      });
  }

  getConceptDisplay(concept: any): string {
    if (!concept) return '-';
    if (typeof concept === 'string') {
      return concept === 'VEHICLE_PAYMENT' ? 'Pago de Vehículo' : concept;
    }
    return concept.description || concept.id || '-';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CO');
  }

  getTotalCash(): number {
    return this.initialCash() + this.totalAmount();
  }

  isShiftCompleted(): boolean {
    const shift = this.currentShift();
    if (!shift || !shift.status) {
      return false;
    }
    const statusId = typeof shift.status === 'string'
      ? shift.status
      : shift.status.id;
    return statusId === 'COMPLETED';
  }

  goToRegistrarSalida(): void {
    this.router.navigate(['/pos/registrar-salida']);
  }
}
