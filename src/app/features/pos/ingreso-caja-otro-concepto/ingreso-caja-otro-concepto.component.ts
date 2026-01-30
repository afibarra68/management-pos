import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShiftService, DShiftAssignment, ShiftConnectionHistory } from '../../../core/services/shift.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { ParamVenta } from '../../../core/services/open-transaction.service';
import { ToastModule } from 'primeng/toast';
import { Subject, forkJoin, takeUntil, finalize, catchError, of } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ingreso-caja-otro-concepto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Textarea,
    MessageModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './ingreso-caja-otro-concepto.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngresoCajaOtroConceptoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private cashRegisterService = inject(CashRegisterService);
  private closedTransactionService = inject(ClosedTransactionService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private shiftService = inject(ShiftService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  loading = false;
  loadingShift = false;
  currentShift: DShiftAssignment | null = null;
  activeShiftHistory: ShiftConnectionHistory | null = null;

  constructor() {
    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentShift();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    this.loadingShift = true;

    // Obtener información del turno activo desde params
    const serviceCode = environment.serviceCode;
    this.closedTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingShift = false;
          this.cdr.markForCheck();
        }),
        catchError(() => of(null))
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          if (params?.dshiftConnectionHistory) {
            const activeHistory = params.dshiftConnectionHistory;
            this.activeShiftHistory = activeHistory;

            // Construir DShiftAssignment a partir de ShiftConnectionHistory
            if (activeHistory.shift && activeHistory.shiftAssignmentId) {
              const shiftAssignment: DShiftAssignment = {
                shiftAssignmentId: activeHistory.shiftAssignmentId,
                shiftId: activeHistory.shiftId || activeHistory.shift?.shiftId,
                shift: activeHistory.shift,
                appUserId: activeHistory.appUserId,
                status: activeHistory.shift?.status || { id: 'CONFIRMED', description: 'Turno confirmado' }
              };
              this.currentShift = shiftAssignment;
            } else {
              this.currentShift = null;
            }
          } else {
            this.activeShiftHistory = null;
            this.currentShift = null;
          }
          this.cdr.markForCheck();
        }
      });
  }

  getShiftDisplayText(): string {
    const shiftAssignment = this.currentShift;
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const historyId = this.activeShiftHistory?.shiftConnectionHistoryId;
    if (!historyId) {
      this.notificationService.error('No hay un turno en proceso activo. Por favor, recargue la página.');
      return;
    }

    const amount = this.form.value.amount;
    const notes = this.form.value.notes?.trim() || undefined;

    this.loading = true;

    this.cashRegisterService.registerOtherIncome(
      historyId,
      amount,
      notes
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.notificationService.success(
            `Ingreso registrado exitosamente. Monto: $${amount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          );
          this.form.reset();

          // Disparar evento para actualizar la vista de caja
          window.dispatchEvent(new CustomEvent('cashRegisterUpdated'));
        },
        error: (err: any) => {
          const errorMessage = this.getErrorMessage(err);
          const status = err?.status;
          const errorResponse = err?.error;

          if (status === 412) {
            const errorDetails = errorResponse?.details ?? errorResponse?.detail;
            this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
          } else {
            this.notificationService.error(errorMessage);
          }
        }
      });
  }

  /**
   * Extrae el mensaje de error legible del response del backend
   */
  private getErrorMessage(err: any): string {
    const status = err?.status;
    const errorResponse = err?.error;

    // Si es un error 412, usar readableMsg si está disponible
    if (status === 412) {
      return errorResponse?.readableMsg || errorResponse?.message || 'Error de validación';
    }

    // Para otros errores, intentar obtener readableMsg primero, luego message
    return errorResponse?.readableMsg || errorResponse?.message || 'Error al registrar el ingreso';
  }
}
