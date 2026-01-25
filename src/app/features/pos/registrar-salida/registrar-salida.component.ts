import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService, ParamVenta } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { EnumResource } from '../../../core/services/enum.service';
import { ClosedTransactionService, FinalizeTransaction } from '../../../core/services/closed-transaction.service';
import { MessageService } from 'primeng/api';
import { NotificationService } from '../../../core/services/notification.service';
import { PrintService } from '../../../core/services/print.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { environment } from '../../../environments/environment';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-registrar-salida',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    Textarea,
    MessageModule,
    DialogModule,
    SharedModule,
    ToastModule
  ],
  templateUrl: './registrar-salida.component.html',
  styleUrls: ['./registrar-salida.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrarSalidaComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private openTransactionService = inject(OpenTransactionService);
  private closedTransactionService = inject(ClosedTransactionService);
  private messageService = inject(MessageService);
  private printService = inject(PrintService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private shiftService = inject(ShiftService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  form: FormGroup;
  loading = false;
  loadingParams = false;
  loadingShift = false;
  error: string | null = null;
  buscando = false;
  showModal = false;
  vehiculoEncontrado: OpenTransaction | null = null;
  params: ParamVenta | null = null;
  currentShift: DShiftAssignment | null = null;
  companyName: string = '';
  currentTime: string = '';

  exitNotes: string = '';

  constructor() {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(8)]]
    });
  }

  ngOnInit(): void {
    this.loadParams();
    this.loadCurrentShift();
    this.loadCompanyName();
    this.updateCurrentTime(); // Actualizar tiempo solo una vez al iniciar
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja errores de forma centralizada
   */
  private handleError(err: any, defaultMessage: string): void {
    const status = err?.status;
    const errorResponse = err?.error;
    
    // Extraer el mensaje legible (readableMsg tiene prioridad)
    const errorMessage = errorResponse?.readableMsg || errorResponse?.message || errorResponse?.error || defaultMessage;
    
    if (status === 412) {
      const errorDetails = errorResponse?.details ?? errorResponse?.detail;
      this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
      this.error = errorMessage;
    } else {
      const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
      this.notificationService.error(errorMessage || genericMessage);
      this.error = errorMessage;
    }
  }

  private loadParams(): void {
    this.loadingParams = true;
    this.error = null;

    const serviceCode = environment.serviceCode;

    this.openTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingParams = false),
        catchError((err: any) => {
          const errorResponse = err?.error;
          this.error = errorResponse?.readableMsg || errorResponse?.message || 'Error al cargar la configuración del servicio. Por favor, recargue la página.';
          return of(null);
        })
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          if (params) {
            this.params = params;
            this.loadCompanyName();
          }
        }
      });
  }

  /**
   * Carga el turno actual del usuario para la fecha de hoy
   */
  private loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    this.loadingShift = true;
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    this.shiftService.getByUserAndDate(userData.appUserId, today)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingShift = false),
        catchError((err) => {
          return of([]);
        })
      )
      .subscribe({
        next: (assignments: DShiftAssignment[]) => {
          // Obtener el primer turno activo (CONFIRMED o PENDING) para hoy
          const activeShift = assignments.find(assignment => {
            const status = assignment.status;
            const statusId = typeof status === 'string' ? status : status?.id;
            return statusId === 'CONFIRMED' || statusId === 'PENDING';
          });

          this.currentShift = activeShift || null;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Obtiene el texto descriptivo del turno para mostrar
   */
  getShiftDisplayText(): string {
    if (!this.currentShift?.shift) {
      return '';
    }

    const shift = this.currentShift.shift;
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

  private loadCompanyName(): void {
    const userData = this.authService.getUserData();
    if (userData?.companyName) {
      this.companyName = userData.companyName;
    } else if (this.params?.collaboratorDescription) {
      this.companyName = this.params.collaboratorDescription;
    }
    this.cdr.markForCheck();
  }

  private updateCurrentTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    this.cdr.markForCheck();
  }


  buscarVehiculo(): void {
    if (this.form.get('vehiclePlate')?.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    this.buscando = true;
    this.error = null;

    const placa = this.form.value.vehiclePlate.toUpperCase().trim();

    this.openTransactionService.findByVehiclePlate(placa)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => {
          this.buscando = false;
          this.vehiculoEncontrado = transaction;
          this.showModal = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.buscando = false;
          this.handleError(err, 'No se encontró un vehículo con esa placa en estado abierto');
          this.cdr.markForCheck();
        }
      });
  }


  procesarSalida(): void {
    const vehicle = this.vehiculoEncontrado;
    if (!vehicle?.vehiclePlate) {
      this.error = 'Información de transacción inválida';
      return;
    }

    if (!this.params) {
      this.error = 'No se han cargado los parámetros del servicio. Por favor, recargue la página.';
      return;
    }

    // Validar si puede gestionar salida con efectivo (solo para vehículos sin suscripción)
    if (vehicle.bySubscription !== true && this.params.canManageCashExit === false) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No permitido',
        detail: 'No tiene permiso para gestionar salidas con recepción de efectivo. Debe tener un turno activo.',
        life: 5000
      });
      return;
    }

    this.loading = true;
    this.error = null;

    const finalizeTransaction: FinalizeTransaction = {
      receiptModel: 'LIQUID',
      vehiclePlate: vehicle.vehiclePlate.toUpperCase().trim(),
      codeService: this.params.serviceCode,
      notes: this.exitNotes?.trim() || undefined
    };

    this.closedTransactionService.closeTransactionWithModel(finalizeTransaction)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (closedTransaction) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Salida registrada exitosamente. Total a pagar: $${closedTransaction.totalAmount ?? 0}`,
            life: 5000
          });

          if (closedTransaction.buildTicket) {
            this.printTicket(closedTransaction.buildTicket);
          }

          this.cerrarModal();
          this.form.reset();
          window.dispatchEvent(new CustomEvent('transactionClosed'));
        },
        error: (err) => this.handleError(err, 'Error al procesar la salida del vehículo')
      });
  }

  goToDashboard(): void {
    this.router.navigate(['/pos']);
  }

  cancelar(): void {
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.showModal = false;
    this.vehiculoEncontrado = null;
    this.exitNotes = '';
    this.cdr.markForCheck();
  }

  /**
   * Obtiene la descripción de un EnumResource o string
   */
  private getDisplayValue(value: string | EnumResource | null | undefined): string {
    if (!value) return 'No disponible';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'description' in value) {
      return value.description ?? value.id ?? 'No disponible';
    }
    return 'No disponible';
  }

  /**
   * Obtiene la descripción del estado para mostrar en el modal
   */
  getStatusDisplay(status: string | EnumResource | null | undefined): string {
    return this.getDisplayValue(status);
  }

  /**
   * Obtiene la descripción del tipo de vehículo para mostrar en el modal
   */
  getTipoVehiculoDisplay(tipoVehiculo: string | EnumResource | null | undefined): string {
    return this.getDisplayValue(tipoVehiculo);
  }

  /**
   * Verifica si el estado es "OPEN" para aplicar estilos
   */
  isStatusOpen(status: string | EnumResource | null | undefined): boolean {
    if (!status) return false;
    const statusId = typeof status === 'string' ? status : status.id;
    return statusId === 'OPEN';
  }

  /**
   * Envía el ticket a imprimir al servicio parking-printing
   */
  private printTicket(buildTicket: any): void {
    if (!buildTicket?.template) {
      return;
    }

    this.printService.printTicket(buildTicket)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: (err) => {}
      });
  }

}

