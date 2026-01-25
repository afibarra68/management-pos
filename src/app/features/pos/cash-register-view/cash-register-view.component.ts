import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { CashRegisterService, CashRegister } from '../../../core/services/cash-register.service';
import { ShiftService, DShiftAssignment, ShiftConnectionHistory } from '../../../core/services/shift.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject, forkJoin, takeUntil, finalize, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputNumberModule,
    DialogModule,
    ToastModule
  ],
  templateUrl: './cash-register-view.component.html',
  styleUrls: ['./cash-register-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashRegisterViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cashRegisterService = inject(CashRegisterService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  currentShift = signal<DShiftAssignment | null>(null);
  activeShiftHistory = signal<ShiftConnectionHistory | null>(null);
  cashRegisters = signal<CashRegister[]>([]);
  summaryByConcept = signal<CashRegisterSummary[]>([]);
  totalAmount = signal(0);
  initialCash = signal(0);
  showCloseShiftDialog = signal(false);
  closingShift = signal(false);
  canCloseShift = signal(false);

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

    const today = new Date().toISOString().split('T')[0];
    this.loading.set(true);

    // Cargar turno activo del histórico
    forkJoin({
      assignments: this.shiftService.getByUserAndDate(user.appUserId, today),
      activeShift: this.shiftService.getOrCreateActiveShift().pipe(
        catchError(() => of(null))
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError(err => {
          this.error.set('Error al cargar el turno actual');
          return of({ assignments: [], activeShift: null });
        })
      )
      .subscribe({
        next: ({ assignments, activeShift }) => {
          // Buscar turno confirmado
          const confirmedShift = assignments.find(a =>
            (typeof a.status === 'string' && a.status === 'CONFIRMED') ||
            (a.status && typeof a.status === 'object' && a.status.id === 'CONFIRMED')
          );

          if (confirmedShift) {
            this.currentShift.set(confirmedShift);
            this.activeShiftHistory.set(activeShift);
            
            // Validar si se puede cerrar el turno
            if (activeShift?.shiftConnectionHistoryId) {
              this.checkCanCloseShift(activeShift.shiftConnectionHistoryId);
            }
            
            this.loadCashRegisters();
          } else {
            this.currentShift.set(null);
            this.activeShiftHistory.set(null);
            this.error.set('No hay un turno activo para hoy');
          }
        }
      });
  }

  private checkCanCloseShift(shiftHistoryId: number): void {
    this.shiftService.canCloseShift(shiftHistoryId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(false))
      )
      .subscribe({
        next: (canClose) => {
          this.canCloseShift.set(canClose);
          this.cdr.markForCheck();
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

  openCloseShiftDialog(): void {
    const activeHistory = this.activeShiftHistory();
    if (activeHistory?.shiftConnectionHistoryId) {
      // Verificar nuevamente si se puede cerrar antes de mostrar el diálogo
      this.checkCanCloseShift(activeHistory.shiftConnectionHistoryId);
    }
    this.showCloseShiftDialog.set(true);
  }

  closeCloseShiftDialog(): void {
    this.showCloseShiftDialog.set(false);
  }

  closeShift(): void {
    const activeHistory = this.activeShiftHistory();
    if (!activeHistory || !activeHistory.shiftConnectionHistoryId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontró el histórico de turno activo'
      });
      return;
    }

    // Validar que se pueda cerrar
    if (!this.canCloseShift()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cerrar',
        detail: 'Aún en servicio, el turno no se puede cerrar. Debe faltar 10 minutos o menos para finalizar.'
      });
      this.showCloseShiftDialog.set(false);
      return;
    }

    this.closingShift.set(true);
    this.error.set(null);

    this.shiftService.closeShiftHistory(activeHistory.shiftConnectionHistoryId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.closingShift.set(false);
          this.cdr.markForCheck();
        }),
        catchError(err => {
          const errorMessage = err?.error?.readableMsg || err?.error?.message || 'Error al cerrar el turno';
          this.error.set(errorMessage);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          return of(null);
        })
      )
      .subscribe({
        next: (closedShift) => {
          if (closedShift) {
            const totalTransactions = activeHistory.totalVehicleExits || 0;
            const totalCash = activeHistory.totalCashReceived || 0;
            
            this.messageService.add({
              severity: 'success',
              summary: 'Turno cerrado',
              detail: `Turno cerrado exitosamente. Transacciones: ${totalTransactions}, Efectivo: ${this.formatCurrency(totalCash)}`
            });
            this.showCloseShiftDialog.set(false);
            this.currentShift.set(null);
            this.activeShiftHistory.set(null);
            this.cashRegisters.set([]);
            this.summaryByConcept.set([]);
            this.totalAmount.set(0);
            this.initialCash.set(0);

            // Recargar turnos para verificar si hay otro turno activo
            this.loadCurrentShift();
          }
        }
      });
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
}
