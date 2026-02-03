import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './registrar-placa.component.html',
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

  // Finder modal
  showPlateFinder = false;
  finderPlateValue = '';

  // Preview de tirilla antes de imprimir
  showTicketPreview = false;
  pendingBuildTicket: any = null;

  constructor() {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(6)]],
      tipoVehiculo: [''],
      basicVehicleType: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadParams();
    this.loadCurrentShift();
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
            this.basicVehicleTypeOptions = this.mapToSelectItems(params.basicVehicleType || []);
          } else {
            this.tipoVehiculoOptions = this.mapToSelectItems(params.vehicleType || []);
          }

          this.setupFormValidators(params.easyMode);
        }
      });
  }

  /**
   * Carga el turno actual del usuario desde la configuración de params
   */
  private loadCurrentShift(): void {
    // Usar la información del turno desde params.dshiftConnectionHistory
    const shiftHistory = this.params?.dshiftConnectionHistory;
    const shift = shiftHistory?.shift;
    if (shift && shiftHistory?.shiftAssignmentId) {
      const shiftAssignment: DShiftAssignment = {
        shiftAssignmentId: shiftHistory.shiftAssignmentId,
        shiftId: shiftHistory.shiftId || shift.shiftId,
        shift: shift,
        appUserId: shiftHistory.appUserId,
        status: shift.status || { id: 'CONFIRMED', description: 'Turno confirmado' }
      };
      this.currentShift = shiftAssignment;
      this.cdr.markForCheck();
    } else {
      this.currentShift = null;
      this.cdr.markForCheck();
    }
  }

  getOptionValue(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.id) return value.id;
    return String(value);
  }

  private findEnumResourceById(id: string, options: SelectItem[]): EnumResource | string | null {
    if (!id || !options) return null;
    const option = options.find(opt => {
      const optValue = opt.value;
      if (typeof optValue === 'string') return optValue === id;
      if (typeof optValue === 'object' && optValue.id) return optValue.id === id;
      return false;
    });
    return option?.value || null;
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
    // Convertir valores del select (pueden ser string o EnumResource)
    const tipoVehiculo = typeof this.form.value.tipoVehiculo === 'string'
      ? this.findEnumResourceById(this.form.value.tipoVehiculo, this.tipoVehiculoOptions)
      : this.form.value.tipoVehiculo;
    const basicVehicleType = typeof this.form.value.basicVehicleType === 'string'
      ? this.findEnumResourceById(this.form.value.basicVehicleType, this.basicVehicleTypeOptions)
      : this.form.value.basicVehicleType;
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

    // Validar turno activo si el módulo está habilitado
    if (this.params.hasActiveShift === false) {
      this.utilsService.showError(
        'No hay turno activo. Debe iniciar un turno para realizar transacciones.',
        'Turno requerido'
      );
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

          // Limpiar completamente el formulario
          this.form.reset({
            vehiclePlate: '',
            tipoVehiculo: '',
            basicVehicleType: '',
            notes: ''
          });
          this.error = null;
          this.success = null;

          // Disparar evento para actualizar el mapa de puestos
          window.dispatchEvent(new CustomEvent('vehicleRegistered'));

          if (response.buildTicket) {
            this.pendingBuildTicket = response.buildTicket;
            this.showTicketPreview = true;
            this.cdr.markForCheck();
          }
        },
        error: (err) => this.handleError(err)
      });
  }

  /**
   * Convierte el template ESC/POS a texto legible para previsualización (quita códigos de control).
   */
  getPreviewText(buildTicket: any): string {
    const raw = buildTicket?.template;
    if (!raw || typeof raw !== 'string') {
      return '';
    }
    // Quitar caracteres de control ESC/POS (0x00-0x1F excepto \n, \r, \t) y DEL (0x7F)
    return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() || '(Sin contenido)';
  }

  /**
   * Usuario confirma imprimir la tirilla: envía al servicio parking-printing y cierra el diálogo.
   */
  confirmPrintTicket(): void {
    const ticket = this.pendingBuildTicket;
    this.showTicketPreview = false;
    this.pendingBuildTicket = null;
    this.cdr.markForCheck();
    if (ticket) {
      this.printTicket(ticket);
    }
  }

  /**
   * Usuario decide no imprimir: cierra el diálogo sin enviar a imprimir.
   */
  cancelPrintTicket(): void {
    this.showTicketPreview = false;
    this.pendingBuildTicket = null;
    this.cdr.markForCheck();
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
        next: () => { },
        error: (err) => { }
      });
  }

  /**
   * Abre el modal estilo Finder para ingresar la placa
   */
  openPlateFinder(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.finderPlateValue = this.form.get('vehiclePlate')?.value || '';
    this.showPlateFinder = true;

    // Forzar detección de cambios
    this.cdr.detectChanges();

    // Focus en el input del finder después de que se renderice
    setTimeout(() => {
      const finderInput = document.querySelector('.finder-input') as HTMLInputElement;
      if (finderInput) {
        finderInput.focus();
        finderInput.select();
      } else {
        // Si no se encuentra, intentar de nuevo
        setTimeout(() => {
          const retryInput = document.querySelector('.finder-input') as HTMLInputElement;
          if (retryInput) {
            retryInput.focus();
            retryInput.select();
          }
        }, 100);
      }
    }, 200);
  }

  /**
   * Cierra el modal Finder
   */
  closePlateFinder(): void {
    this.showPlateFinder = false;
    this.finderPlateValue = '';
    this.cdr.detectChanges(); // Usar detectChanges para forzar la actualización
  }

  /**
   * Maneja la entrada de texto en el finder
   */
  onFinderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.finderPlateValue = target.value.toUpperCase();

    // Auto-confirmar cuando se alcanzan 6 caracteres
    if (this.finderPlateValue.length === 6) {
      setTimeout(() => {
        this.confirmPlate();
      }, 100);
    }
  }

  /**
   * Confirma la placa ingresada en el finder
   */
  confirmPlate(): void {
    if (this.finderPlateValue && this.finderPlateValue.length >= 3) {
      const plateValue = this.finderPlateValue.toUpperCase().trim();
      this.form.patchValue({ vehiclePlate: plateValue });
      this.closePlateFinder();

      // Buscar si existe una transacción abierta con esta placa para autocompletar el tipo de vehículo
      this.searchVehicleTypeByPlate(plateValue);

      // Auto-focus al siguiente campo (tipo de vehículo)
      setTimeout(() => {
        this.focusNextField();
      }, 100);
    }
  }

  /**
   * Maneja la entrada de texto en el campo de placa normal (por si acaso)
   */
  onPlateInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.toUpperCase();
    this.form.patchValue({ vehiclePlate: value });

    // Auto-focus al siguiente campo cuando se completa la placa (6 caracteres)
    if (value.length === 6) {
      setTimeout(() => {
        this.focusNextField();
      }, 100);
    }
  }

  /**
   * Enfoca el siguiente campo después de completar uno
   */
  onFieldComplete(fieldName: string): void {
    // Si se completa el tipo de vehículo, pasar a notas
    if (fieldName === 'basicVehicleType' || fieldName === 'tipoVehiculo') {
      setTimeout(() => {
        const notesField = document.getElementById('notes') as HTMLTextAreaElement;
        if (notesField) {
          notesField.focus();
        }
      }, 100);
    }
  }

  /**
   * Busca una transacción abierta por placa y autocompleta el tipo de vehículo si existe
   */
  private searchVehicleTypeByPlate(vehiclePlate: string): void {
    if (!vehiclePlate || vehiclePlate.length < 3) {
      return;
    }

    this.openTransactionService.findByVehiclePlate(vehiclePlate)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          // Si no existe la transacción, no hacer nada (es normal)
          return of(null);
        })
      )
      .subscribe({
        next: (transaction: OpenTransaction | null) => {
          if (!transaction || !this.params) {
            return;
          }

          // Si existe una transacción abierta con esta placa, autocompletar el tipo de vehículo
          if (this.easyMode && transaction.basicVehicleType) {
            // Buscar el valor en las opciones disponibles
            const basicType = transaction.basicVehicleType;
            const basicTypeId = typeof basicType === 'string' ? basicType : basicType?.id;

            if (basicTypeId) {
              const option = this.basicVehicleTypeOptions.find(opt => {
                const optValue = opt.value;
                if (typeof optValue === 'string') return optValue === basicTypeId;
                if (typeof optValue === 'object' && optValue.id) return optValue.id === basicTypeId;
                return false;
              });

              if (option) {
                this.form.patchValue({ basicVehicleType: this.getOptionValue(option.value) });
                this.cdr.markForCheck();
              }
            }
          } else if (!this.easyMode && transaction.tipoVehiculo) {
            // Buscar el valor en las opciones disponibles
            const tipoVehiculo = transaction.tipoVehiculo;
            const tipoVehiculoId = typeof tipoVehiculo === 'string' ? tipoVehiculo : tipoVehiculo?.id;

            if (tipoVehiculoId) {
              const option = this.tipoVehiculoOptions.find(opt => {
                const optValue = opt.value;
                if (typeof optValue === 'string') return optValue === tipoVehiculoId;
                if (typeof optValue === 'object' && optValue.id) return optValue.id === tipoVehiculoId;
                return false;
              });

              if (option) {
                this.form.patchValue({ tipoVehiculo: this.getOptionValue(option.value) });
                this.cdr.markForCheck();
              }
            }
          }
        }
      });
  }

  /**
   * Enfoca el siguiente campo disponible
   */
  private focusNextField(): void {
    if (!this.params) {
      return;
    }

    // Determinar qué campo es el siguiente según el modo
    const nextFieldId = this.easyMode ? 'basicVehicleType' : 'tipoVehiculo';
    const nextField = document.getElementById(nextFieldId) as HTMLSelectElement;

    if (nextField) {
      nextField.focus();
    }
  }
}
