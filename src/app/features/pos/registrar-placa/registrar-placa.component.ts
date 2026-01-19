import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
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
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
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
    Textarea,
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './registrar-placa.component.html',
  styleUrls: ['./registrar-placa.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrarPlacaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private openTransactionService = inject(OpenTransactionService);
  private enumService = inject(EnumService);
  private router = inject(Router);
  private utilsService = inject(UtilsService);
  private printService = inject(PrintService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private shiftService = inject(ShiftService);
  private cdr = inject(ChangeDetectorRef);
  
  form: FormGroup;
  loading = false;
  loadingTipos = false;
  loadingParams = false;
  loadingShift = false;
  error: string | null = null;
  success: string | null = null;
  tipoVehiculoOptions: SelectItem[] = [];
  basicVehicleTypeOptions: SelectItem[] = [];
  easyMode = false;
  params: ParamVenta | null = null;
  currentShift: DShiftAssignment | null = null;
  companyName: string = '';
  currentTime: string = '';

  constructor() {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(8)]],
      tipoVehiculo: [''],
      basicVehicleType: [''],
      notes: ['']
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
   * Convierte EnumResource[] a SelectItem[]
   */
  private mapToSelectItems(types: EnumResource[]): SelectItem[] {
    return types.map(tipo => ({
      label: tipo.description ?? tipo.id,
      value: tipo
    }));
  }

  /**
   * Configura los validadores del formulario según el modo
   */
  private setupFormValidators(isEasyMode: boolean): void {
    const basicVehicleTypeControl = this.form.get('basicVehicleType');
    const tipoVehiculoControl = this.form.get('tipoVehiculo');
    
    if (isEasyMode) {
      basicVehicleTypeControl?.setValidators([Validators.required]);
      tipoVehiculoControl?.clearValidators();
    } else {
      tipoVehiculoControl?.setValidators([Validators.required]);
      basicVehicleTypeControl?.clearValidators();
    }
    
    basicVehicleTypeControl?.updateValueAndValidity();
    tipoVehiculoControl?.updateValueAndValidity();
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
            this.basicVehicleTypeOptions = this.mapToSelectItems(params.basicVehicleType);
          } else {
            this.tipoVehiculoOptions = this.mapToSelectItems(params.vehicleType);
          }
          
          this.setupFormValidators(params.easyMode);
          this.loadCompanyName();
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
          // No mostrar error al usuario, simplemente no mostrar información del turno
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
  goToDashboard(): void {
    this.router.navigate(['/pos']);
  }

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

  private loadTiposVehiculoFallback(): void {
    this.loadingTipos = true;
    
    const defaultTypes: EnumResource[] = [
      { id: 'AUTOMOVIL', description: 'Automóvil' },
      { id: 'MOTOCICLETA', description: 'Motocicleta' },
      { id: 'CAMIONETA', description: 'Camioneta' },
      { id: 'CAMION', description: 'Camión' }
    ];
    
    this.enumService.getEnumByName('ETipoVehiculo')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingTipos = false),
        catchError(() => {
          // Fallback a valores por defecto si falla la carga
          this.tipoVehiculoOptions = this.mapToSelectItems(defaultTypes);
          this.setupFormValidators(false);
          return of([]);
        })
      )
      .subscribe({
        next: (tipos: EnumResource[]) => {
          if (tipos?.length > 0) {
            this.tipoVehiculoOptions = this.mapToSelectItems(tipos);
            this.setupFormValidators(false);
          }
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
    const notes = this.form.value.notes?.trim() || null;

    // Mostrar diálogo de confirmación
    this.utilsService.confirmVehicleEntry(vehiclePlate).subscribe({
      next: (confirmed) => {
        if (confirmed) {
          this.processRegistration(vehiclePlate, tipoVehiculo, basicVehicleType, notes);
        }
      }
    });
  }

  /**
   * Convierte un tipo de vehículo a EnumResource
   */
  private normalizeVehicleType(type: EnumResource | string | null): EnumResource | undefined {
    if (!type) return undefined;
    return typeof type === 'string' 
      ? { id: type, description: type }
      : type;
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
      const errorDetails = errorResponse?.details ?? errorResponse?.detail;
      this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
      this.error = errorMessage;
    } else {
      const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
      this.notificationService.error(errorMessage || genericMessage);
      this.error = errorMessage;
    }
  }

  private processRegistration(vehiclePlate: string, tipoVehiculo: EnumResource | string | null, basicVehicleType: EnumResource | string | null, notes: string | null = null): void {
    if (!this.params) {
      this.error = 'No se han cargado los parámetros del servicio.';
      return;
    }

    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      this.error = 'No se pudo obtener la información del usuario autenticado.';
      return;
    }

    this.loading = true;
    this.error = null;

    const transactionData: OpenTransaction = {
      vehiclePlate,
      codeService: this.params.serviceCode,
      serviceTypeServiceTypeId: this.params.companyBusinessServiceId ?? this.params.collaboratorId,
      appUserAppUserSeller: userData.appUserId,
      notes: notes || undefined
    };

    // Agregar tipo de vehículo según el modo
    if (this.easyMode) {
      transactionData.basicVehicleType = this.normalizeVehicleType(basicVehicleType);
    } else {
      transactionData.tipoVehiculo = this.normalizeVehicleType(tipoVehiculo);
    }

    this.openTransactionService.create(transactionData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response) => {
          this.utilsService.showSuccess(
            `Placa ${response.vehiclePlate} registrada exitosamente`,
            'Ingreso Confirmado'
          );
          this.form.reset();
          
          // Disparar evento para actualizar el mapa de puestos
          window.dispatchEvent(new CustomEvent('vehicleRegistered'));
          
          if (response.buildTicket) {
            this.printTicket(response.buildTicket);
          }
        },
        error: (err) => this.handleError(err)
      });
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
