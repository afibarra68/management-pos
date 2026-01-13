import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService, ParamVenta } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { UtilsService } from '../../../core/services/utils.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PrintService } from '../../../core/services/print.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SelectItem } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-registrar-placa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './registrar-placa.component.html',
  styleUrls: ['./registrar-placa.component.scss']
})
export class RegistrarPlacaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  
  form: FormGroup;
  loading = false;
  loadingTipos = false;
  loadingParams = false;
  error: string | null = null;
  success: string | null = null;
  tipoVehiculoOptions: SelectItem[] = [];
  basicVehicleTypeOptions: SelectItem[] = [];
  easyMode = false;
  params: ParamVenta | null = null;

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    private enumService: EnumService,
    public router: Router,
    private utilsService: UtilsService,
    private printService: PrintService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      tipoVehiculo: [''],
      basicVehicleType: ['']
    });
  }

  ngOnInit(): void {
    this.loadParams();
  }

  ngOnDestroy(): void {
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
          // Fallback: cargar tipos de vehículo por defecto
          this.loadTiposVehiculoFallback();
          return of(null);
        })
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          if (!params) {
            return;
          }
          
          this.params = params;
          this.easyMode = params.easyMode;
          
          if (params.easyMode) {
            // Si easyMode es true, usar basicVehicleType
            this.basicVehicleTypeOptions = params.basicVehicleType.map(tipo => ({
              label: tipo.description || tipo.id,
              value: tipo
            }));
            // Hacer required basicVehicleType y no required tipoVehiculo
            this.form.get('basicVehicleType')?.setValidators([Validators.required]);
            this.form.get('tipoVehiculo')?.clearValidators();
            this.form.get('basicVehicleType')?.updateValueAndValidity();
            this.form.get('tipoVehiculo')?.updateValueAndValidity();
          } else {
            // Si easyMode es false, usar vehicleType
            this.tipoVehiculoOptions = params.vehicleType.map(tipo => ({
              label: tipo.description || tipo.id,
              value: tipo
            }));
            // Hacer required tipoVehiculo y no required basicVehicleType
            this.form.get('tipoVehiculo')?.setValidators([Validators.required]);
            this.form.get('basicVehicleType')?.clearValidators();
            this.form.get('tipoVehiculo')?.updateValueAndValidity();
            this.form.get('basicVehicleType')?.updateValueAndValidity();
          }
          
          this.cdr.detectChanges();
        }
      });
  }

  private loadTiposVehiculoFallback(): void {
    this.loadingTipos = true;
    this.enumService.getEnumByName('ETipoVehiculo')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingTipos = false;
          this.cdr.detectChanges();
        }),
        catchError((err) => {
          console.error('Error al cargar tipos de vehículo:', err);
          // Fallback a valores por defecto si falla la carga
          this.tipoVehiculoOptions = [
            { label: 'Automóvil', value: { id: 'AUTOMOVIL', description: 'Automóvil' } as EnumResource },
            { label: 'Motocicleta', value: { id: 'MOTOCICLETA', description: 'Motocicleta' } as EnumResource },
            { label: 'Camioneta', value: { id: 'CAMIONETA', description: 'Camioneta' } as EnumResource },
            { label: 'Camión', value: { id: 'CAMION', description: 'Camión' } as EnumResource }
          ];
          this.form.get('tipoVehiculo')?.setValidators([Validators.required]);
          this.form.get('tipoVehiculo')?.updateValueAndValidity();
          return of([]);
        })
      )
      .subscribe({
        next: (tipos: EnumResource[]) => {
          if (tipos && tipos.length > 0) {
            this.tipoVehiculoOptions = tipos.map(tipo => ({
              label: tipo.description || tipo.id,
              value: tipo
            }));
            this.form.get('tipoVehiculo')?.setValidators([Validators.required]);
            this.form.get('tipoVehiculo')?.updateValueAndValidity();
          }
          this.cdr.detectChanges();
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.error = 'Por favor complete todos los campos requeridos';
      return;
    }

    if (!this.params) {
      this.error = 'No se han cargado los parámetros del servicio. Por favor, recargue la página.';
      return;
    }

    const vehiclePlate = this.form.value.vehiclePlate.toUpperCase().trim();
    const tipoVehiculo = this.form.value.tipoVehiculo;
    const basicVehicleType = this.form.value.basicVehicleType;

    // Mostrar diálogo de confirmación
    this.utilsService.confirmVehicleEntry(vehiclePlate).subscribe({
      next: (confirmed) => {
        if (confirmed) {
          this.processRegistration(vehiclePlate, tipoVehiculo, basicVehicleType);
        }
      }
    });
  }

  private processRegistration(vehiclePlate: string, tipoVehiculo: EnumResource | string | null, basicVehicleType: EnumResource | string | null): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    if (!this.params) {
      this.loading = false;
      this.error = 'No se han cargado los parámetros del servicio.';
      return;
    }

    // Obtener datos del usuario autenticado
    const userData = this.authService.getUserData();
    if (!userData || !userData.appUserId) {
      this.loading = false;
      this.error = 'No se pudo obtener la información del usuario autenticado.';
      return;
    }

    // Preparar los datos de la transacción según el modo
    const transactionData: OpenTransaction = {
      vehiclePlate: vehiclePlate,
      codeService: this.params.serviceCode,
      serviceTypeServiceTypeId: this.params.companyBusinessServiceId || this.params.collaboratorId,
      appUserAppUserSeller: userData.appUserId
    };

    // Agregar tipo de vehículo según el modo
    if (this.easyMode) {
      // Si easyMode es true, usar basicVehicleType
      if (basicVehicleType) {
        transactionData.basicVehicleType = typeof basicVehicleType === 'string' 
          ? { id: basicVehicleType, description: basicVehicleType } as EnumResource
          : basicVehicleType;
      }
    } else {
      // Si easyMode es false, usar tipoVehiculo
      if (tipoVehiculo) {
        transactionData.tipoVehiculo = typeof tipoVehiculo === 'string' 
          ? { id: tipoVehiculo, description: tipoVehiculo } as EnumResource
          : tipoVehiculo;
      }
    }

    this.openTransactionService.create(transactionData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.utilsService.showSuccess(
            `Placa ${response.vehiclePlate} registrada exitosamente`,
            'Ingreso Confirmado'
          );
          this.form.reset();

          // Enviar ticket a imprimir si viene en la respuesta
          if (response.buildTicket) {
            this.printTicket(response.buildTicket);
          }
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
            this.error = err?.error?.message || 'Error al registrar la placa';
          }
        }
      });
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

    this.printService.printTicket(buildTicket).subscribe({
      next: () => {
        console.log('Ticket enviado a imprimir exitosamente');
      },
      error: (err) => {
        console.error('Error al enviar ticket a imprimir:', err);
        // No mostramos error al usuario ya que el registro fue exitoso
        // Solo lo registramos en consola
      }
    });
  }
}
