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
import { ToastModule } from 'primeng/toast';
import { Subject, forkJoin, takeUntil, finalize, catchError, of } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';

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
  styleUrls: ['./ingreso-caja-otro-concepto.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngresoCajaOtroConceptoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private cashRegisterService = inject(CashRegisterService);
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
  companyName: string = '';
  currentTime: string = '';

  constructor() {
    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentShift();
    this.loadCompanyName();
    this.updateCurrentTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateCurrentTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.cdr.markForCheck();
  }

  loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    this.loadingShift = true;
    const today = new Date().toISOString().split('T')[0];

    forkJoin({
      assignments: this.shiftService.getByUserAndDate(userData.appUserId, today).pipe(catchError(() => of([]))),
      activeHistory: this.shiftService.getOrCreateActiveShift().pipe(catchError(() => of(null)))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingShift = false;
          this.cdr.markForCheck();
        }),
        catchError(() => of({ assignments: [], activeHistory: null }))
      )
      .subscribe({
        next: ({ assignments, activeHistory }) => {
          const activeShift = assignments?.find(a => {
            const s = a.status;
            const id = typeof s === 'string' ? s : s?.id;
            return id === 'CONFIRMED' || id === 'PENDING';
          }) || null;
          this.currentShift = activeShift || null;
          this.activeShiftHistory = activeHistory || null;
          this.cdr.markForCheck();
        }
      });
  }

  loadCompanyName(): void {
    const userData = this.authService.getUserData();
    if (userData?.companyName) {
      this.companyName = userData.companyName;
      this.cdr.markForCheck();
    }
  }

  getShiftDisplayText(): string {
    if (!this.currentShift) return 'No asignado';
    const shiftType = this.currentShift.shift?.shiftType?.typeName || '';
    return `${shiftType}`;
  }

  goToDashboard(): void {
    this.router.navigate(['/pos']);
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
