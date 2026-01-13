import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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
import { AuthService } from '../../../core/services/auth.service';
import { PrintService } from '../../../core/services/print.service';
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
    MessageModule,
    DialogModule,
    SharedModule,
    ToastModule
  ],
  templateUrl: './registrar-salida.component.html',
  styleUrls: ['./registrar-salida.component.scss']
})
export class RegistrarSalidaComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  loadingParams = false;
  error: string | null = null;
  buscando = false;
  showModal = false;
  vehiculoEncontrado: OpenTransaction | null = null;
  tiempoTranscurrido: string = '';
  params: ParamVenta | null = null;
  private intervalId: any;
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    private closedTransactionService: ClosedTransactionService,
    private messageService: MessageService,
    private authService: AuthService,
    private printService: PrintService
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    this.loadParams();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadParams(): void {
    this.loadingParams = true;
    this.error = null;
    this.cdr.detectChanges();

    const serviceCode = environment.serviceCode;

    this.openTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingParams = false;
          this.cdr.detectChanges();
        }),
        catchError((err) => {
          console.error('Error al cargar parámetros:', err);
          this.error = err?.error?.message || 'Error al cargar la configuración del servicio. Por favor, recargue la página.';
          return of(null);
        })
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          if (params) {
            this.params = params;
          }
        }
      });
  }

  buscarVehiculo(): void {
    if (this.form.get('vehiclePlate')?.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    this.buscando = true;
    this.error = null;

    const placa = this.form.value.vehiclePlate.toUpperCase().trim();

    this.openTransactionService.findByVehiclePlate(placa).subscribe({
      next: (transaction) => {
        this.buscando = false;
        this.vehiculoEncontrado = transaction;
        this.calcularTiempoTranscurrido();
        this.cdr.detectChanges();
        this.showModal = true;
        this.cdr.detectChanges();
        // Actualizar tiempo cada minuto
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
          this.calcularTiempoTranscurrido();
        }, 60000); // Cada minuto
      },
      error: (err) => {
        this.buscando = false;
        const status = err?.status;
        const errorResponse = err?.error;
        
        // Si es error 412 (PRECONDITION_FAILED), mostrar el mensaje del backend
        if (status === 412) {
          const errorMessage = errorResponse?.message || errorResponse?.error || 'Error de validación';
          const errorDetails = errorResponse?.details || errorResponse?.detail;
          
          // Mostrar notificación con el mensaje del backend
          this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
          this.error = errorMessage;
        } else {
          // Para otros errores, mostrar mensaje genérico
          const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
          this.notificationService.error(genericMessage);
          this.error = err?.error?.message || 'No se encontró un vehículo con esa placa en estado abierto';
        }
        this.cdr.detectChanges();
      }
    });
  }

  calcularTiempoTranscurrido(): void {
    if (!this.vehiculoEncontrado?.startDay || !this.vehiculoEncontrado?.startTime) {
      this.tiempoTranscurrido = 'No disponible';
      return;
    }

    const startDate = new Date(`${this.vehiculoEncontrado.startDay}T${this.vehiculoEncontrado.startTime}`);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    this.tiempoTranscurrido = `${hours}h ${minutes}m`;
  }

  procesarSalida(): void {
    if (!this.vehiculoEncontrado || !this.vehiculoEncontrado.vehiclePlate) {
      this.error = 'Información de transacción inválida';
      return;
    }

    if (!this.params) {
      this.error = 'No se han cargado los parámetros del servicio. Por favor, recargue la página.';
      return;
    }

    this.loading = true;
    this.error = null;

    // Preparar el objeto FinalizeTransaction según el nuevo endpoint
    const finalizeTransaction: FinalizeTransaction = {
      receiptModel: 'LIQUID',
      vehiclePlate: this.vehiculoEncontrado.vehiclePlate.toUpperCase().trim(),
      codeService: this.params.serviceCode
    };

    this.closedTransactionService.closeTransactionWithModel(finalizeTransaction)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (closedTransaction) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Salida registrada exitosamente. Total a pagar: $${closedTransaction.totalAmount || 0}`,
            life: 5000
          });

          // Enviar ticket a imprimir si viene en la respuesta
          if (closedTransaction.buildTicket) {
            this.printTicket(closedTransaction.buildTicket);
          }

          this.cerrarModal();
          this.form.reset();
          // Emitir evento para actualizar el dashboard
          window.dispatchEvent(new CustomEvent('transactionClosed'));
        },
        error: (err) => {
          const status = err?.status;
          const errorResponse = err?.error;
          
          // Si es error 412 (PRECONDITION_FAILED), mostrar el mensaje del backend
          if (status === 412) {
            const errorMessage = errorResponse?.message || errorResponse?.error || 'Error de validación';
            const errorDetails = errorResponse?.details || errorResponse?.detail;
            
            // Mostrar notificación con el mensaje del backend
            this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
            this.error = errorMessage;
          } else {
            // Para otros errores, mostrar mensaje genérico
            const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
            this.notificationService.error(genericMessage);
            this.error = err?.error?.message || 'Error al procesar la salida del vehículo';
          }
        }
      });
  }

  cancelar(): void {
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.showModal = false;
    this.vehiculoEncontrado = null;
    this.tiempoTranscurrido = '';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Obtiene la descripción del estado para mostrar en el modal
   * @param status Estado que puede ser string o EnumResource
   * @returns Descripción del estado o el valor como string
   */
  getStatusDisplay(status: string | EnumResource | null | undefined): string {
    if (!status) {
      return 'No disponible';
    }

    if (typeof status === 'string') {
      // Si es string, retornar directamente
      return status;
    }

    // Si es EnumResource, retornar description o id
    if (typeof status === 'object' && 'description' in status) {
      return status.description || status.id || 'No disponible';
    }

    return 'No disponible';
  }

  /**
   * Obtiene la descripción del tipo de vehículo para mostrar en el modal
   * @param tipoVehiculo Tipo de vehículo que puede ser string o EnumResource
   * @returns Descripción del tipo de vehículo o el valor como string
   */
  getTipoVehiculoDisplay(tipoVehiculo: string | EnumResource | null | undefined): string {
    if (!tipoVehiculo) {
      return 'No disponible';
    }

    if (typeof tipoVehiculo === 'string') {
      return tipoVehiculo;
    }

    if (typeof tipoVehiculo === 'object' && 'description' in tipoVehiculo) {
      return tipoVehiculo.description || tipoVehiculo.id || 'No disponible';
    }

    return 'No disponible';
  }

  /**
   * Verifica si el estado es "OPEN" para aplicar estilos
   * @param status Estado que puede ser string o EnumResource
   * @returns true si el estado es "OPEN"
   */
  isStatusOpen(status: string | EnumResource | null | undefined): boolean {
    if (!status) {
      return false;
    }

    if (typeof status === 'string') {
      return status === 'OPEN';
    }

    if (typeof status === 'object' && 'id' in status) {
      return status.id === 'OPEN';
    }

    return false;
  }

  /**
   * Envía el ticket a imprimir al servicio parking-printing
   * @param buildTicket Objeto con el template y datos de la impresora
   */
  private printTicket(buildTicket: any): void {
    if (!buildTicket || !buildTicket.template) {
      console.warn('No se puede imprimir: buildTicket o template no disponible');
      return;
    }

    this.printService.printTicket(buildTicket)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Ticket de salida enviado a imprimir exitosamente');
        },
        error: (err) => {
          console.error('Error al enviar ticket de salida a imprimir:', err);
          // No mostramos error al usuario ya que el registro fue exitoso
          // Solo lo registramos en consola
        }
      });
  }

}

