import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService, ParamVenta } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { EnumResource } from '../../../core/services/enum.service';
import { ClosedTransactionService, ClosedTransaction, FinalizeTransaction } from '../../../core/services/closed-transaction.service';
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
    MessageModule,
    DialogModule,
    TableModule,
    SharedModule,
    ToastModule
  ],
  templateUrl: './registrar-salida.component.html',
  styleUrl: './registrar-salida.component.scss',
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

  exitNotes: string = '';

  // Modal confirmar impresión (igual que en registrar ingreso)
  showTicketPreview = false;
  pendingBuildTicket: any = null;
  pendingTotalAmount: number | null = null;

  // Reimprimir tirilla de salida (como en vehiculos-parqueadero / pos-dashboard)
  reprintingId = signal<number | null>(null);
  reprintList: ClosedTransaction[] = [];
  loadingReprint = false;
  reprintError: string | null = null;
  reprintPlate = '';
  reprintTotalElements = 0;
  reprintTotalPages = 0;
  reprintPage = 0;
  /** Siempre limitar a 10 cuando consulta backend (Buscar). */
  reprintSize = 10;
  reprintLastQueryPlate: string | null = null;

  constructor() {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(8)]]
    });
  }

  ngOnInit(): void {
    this.loadParams();
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
            this.loadCurrentShift();
          }
          // Cargar salidas recientes al iniciar (misma lógica que "Buscar", siempre backend).
          this.buscarSalidas();
        }
      });
  }

  private formatDateYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getRecentDateRange(daysBack = 7): { endDateFrom: string; endDateTo: string } {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Math.max(0, daysBack));
    return {
      endDateFrom: this.formatDateYMD(from),
      endDateTo: this.formatDateYMD(to)
    };
  }

  /**
   * Carga el turno actual del usuario para la fecha de hoy
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

  buscarVehiculo(): void {
    if (this.form.get('vehiclePlate')?.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    this.buscando = true;
    this.error = null;

    const placa = this.form.value.vehiclePlate.toUpperCase().trim();

    this.openTransactionService.findByVehiclePlate(placa, true)
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
      notes: this.exitNotes?.trim() || undefined,
      shiftConnectionHistoryId: this.params?.dshiftConnectionHistory?.shiftConnectionHistoryId
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

          // Limpiar modal de vehículo y formulario
          this.cerrarModal();
          this.form.reset({
            vehiclePlate: ''
          });
          this.error = null;
          this.exitNotes = '';

          window.dispatchEvent(new CustomEvent('transactionClosed'));

          // Mostrar modal confirmar impresión (igual que en registrar ingreso)
          if (closedTransaction.buildTicket) {
            this.pendingBuildTicket = closedTransaction.buildTicket;
            this.pendingTotalAmount = closedTransaction.totalAmount ?? null;
            this.showTicketPreview = true;
            this.cdr.markForCheck();
          }
        },
        error: (err) => this.handleError(err, 'Error al procesar la salida del vehículo')
      });
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
   * Convierte el template ESC/POS a texto legible para previsualización (igual que registrar ingreso).
   */
  getPreviewText(buildTicket: any): string {
    const raw = buildTicket?.template;
    if (!raw || typeof raw !== 'string') {
      return '';
    }
    return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() || '(Sin contenido)';
  }

  /**
   * Usuario confirma imprimir la tirilla: envía al servicio parking-printing y cierra el modal.
   */
  confirmPrintTicket(): void {
    const ticket = this.pendingBuildTicket;
    this.showTicketPreview = false;
    this.pendingBuildTicket = null;
    this.pendingTotalAmount = null;
    this.cdr.markForCheck();
    if (ticket) {
      this.printTicket(ticket);
    }
    this.loadUltimasReimpresiones();
  }

  /**
   * Usuario decide no imprimir: cierra el modal sin enviar a imprimir.
   */
  cancelPrintTicket(): void {
    this.showTicketPreview = false;
    this.pendingBuildTicket = null;
    this.pendingTotalAmount = null;
    this.cdr.markForCheck();
    this.loadUltimasReimpresiones();
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

  // --- Reimprimir tirilla de salida (misma lógica que pos-dashboard / vehiculos-parqueadero) ---

  /**
   * Carga salidas recientes (últimos días) con paginación.
   * - Sin placa: trae las últimas salidas recientes.
   * - Con placa (botón "Buscar en backend"): consulta el backend y trae más resultados por placa.
   */
  loadUltimasReimpresiones(opts?: { reset?: boolean; useBackendPlateFilter?: boolean }): void {
    const companyId = this.authService.getUserData()?.companyId ?? this.params?.collaboratorId;
    if (companyId == null) {
      this.reprintError = 'No se pudo obtener la empresa del usuario.';
      this.loadingReprint = false;
      this.cdr.markForCheck();
      return;
    }

    const reset = opts?.reset !== false;
    const useBackendPlateFilter = opts?.useBackendPlateFilter === true;
    const plate = (this.reprintPlate ?? '').trim().toUpperCase();
    const queryPlate = useBackendPlateFilter ? plate : '';

    if (reset) {
      this.reprintPage = 0;
      this.reprintList = [];
      this.reprintTotalElements = 0;
      this.reprintTotalPages = 0;
      this.reprintLastQueryPlate = queryPlate || null;
    }

    this.loadingReprint = true;
    this.reprintError = null;
    this.cdr.markForCheck();

    this.closedTransactionService.getByDateRange({
      companyCompanyId: companyId,
      vehiclePlate: queryPlate || undefined,
      page: this.reprintPage,
      size: this.reprintSize,
      sort: 'closedTransactionId,desc'
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: unknown) => {
          const msg = (err as { error?: { readableMsg?: string; message?: string }; message?: string })?.error?.readableMsg
            ?? (err as { error?: { message?: string } })?.error?.message
            ?? (err as { message?: string })?.message
            ?? 'Error al cargar transacciones';
          this.reprintError = msg;
          if (reset) {
            this.reprintList = [];
          }
          return of({ content: [] as ClosedTransaction[], totalElements: 0, totalPages: 0 });
        }),
        finalize(() => {
          this.loadingReprint = false;
          // Asegurar que el "Cargando..." desaparezca incluso en OnPush
          try {
            this.cdr.detectChanges();
          } catch {
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: (res) => {
          // El backend normalmente retorna Page { content, totalElements, totalPages }.
          // Pero en algunos entornos/proxys puede venir envuelto o incluso como array directo.
          const anyRes = res as unknown as any;
          const list =
            (Array.isArray(anyRes) ? anyRes : null)
            ?? (Array.isArray(anyRes?.content) ? anyRes.content : null)
            ?? (Array.isArray(anyRes?.data?.content) ? anyRes.data.content : null)
            ?? (Array.isArray(anyRes?.body?.content) ? anyRes.body.content : null)
            ?? [];
          const incoming = Array.isArray(list) ? (list as ClosedTransaction[]) : [];
          const merged = reset ? incoming : [...this.reprintList, ...incoming];
          // dedupe por closedTransactionId si viene repetido por paginación/orden
          const seen = new Set<number>();
          this.reprintList = merged.filter(tx => {
            const id = tx.closedTransactionId ?? -1;
            if (id <= 0) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          this.reprintTotalElements =
            anyRes?.totalElements
            ?? anyRes?.data?.totalElements
            ?? anyRes?.body?.totalElements
            ?? this.reprintTotalElements;
          this.reprintTotalPages =
            anyRes?.totalPages
            ?? anyRes?.data?.totalPages
            ?? anyRes?.body?.totalPages
            ?? this.reprintTotalPages;
          this.reprintError = null;
          // Si llegó respuesta, no mantener el estado de "cargando"
          this.loadingReprint = false;
          // Asegurar render inmediato con OnPush + PrimeNG table
          try {
            this.cdr.detectChanges();
          } catch {
            this.cdr.markForCheck();
          }
        }
      });
  }

  buscarSalidas(): void {
    // Siempre consulta al backend. Si no hay placa, trae las últimas 10 recientes sin filtro.
    // Si hay placa (cualquier longitud), aplica filtro por placa en backend.
    this.loadUltimasReimpresiones({ reset: true, useBackendPlateFilter: true });
  }

  /**
   * Lista a mostrar: últimas 10 filtradas por placa (opcional) en el cliente.
   */
  get reprintListFiltered(): ClosedTransaction[] {
    const plate = this.reprintPlate?.trim().toUpperCase() || '';
    if (!plate) return this.reprintList;
    return this.reprintList.filter(tx =>
      (tx.vehiclePlate ?? '').toUpperCase().includes(plate)
    );
  }

  /**
   * Reimprime la tirilla de salida de una transacción cerrada (igual que en pos-dashboard).
   */
  reimprimirTicketSalida(closedTransactionId: number): void {
    if (!closedTransactionId) {
      this.notificationService.error('ID de transacción inválido');
      return;
    }

    this.reprintingId.set(closedTransactionId);
    this.cdr.markForCheck();

    this.closedTransactionService.getReprintTicketData(closedTransactionId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: unknown) => {
          this.handleError(err, 'Error al obtener datos para reimprimir');
          return of(null);
        }),
        finalize(() => {
          this.reprintingId.set(null);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (buildTicket) => {
          if (!buildTicket?.template) {
            this.notificationService.error('No se recibieron datos de impresión');
            return;
          }
          this.printService.printTicket(buildTicket)
            .pipe(
              takeUntil(this.destroy$),
              catchError((printErr: unknown) => {
                const msg = (printErr as { error?: string; message?: string })?.error
                  ?? (printErr as { message?: string })?.message
                  ?? 'Error al enviar a la impresora';
                this.notificationService.error(msg);
                return of(null);
              })
            )
            .subscribe({
              next: () => this.notificationService.success('Ticket reimpreso y enviado a la impresora correctamente')
            });
        }
      });
  }

  /**
   * Fecha / Hora salida: combina endDate y endTime.
   * endTime puede venir como "09:13:32 PM" (12h) o "21:13:32" (24h).
   */
  formatEndDateTime(endDate: string | undefined | null, endTime: string | undefined | null): string {
    if (!endDate) return 'N/A';
    const timePart = (endTime ?? '').trim();
    const dateFormatted = this.formatDateOnly(endDate);
    if (!timePart) return dateFormatted;
    if (/AM|PM/i.test(timePart)) {
      return `${dateFormatted} ${timePart}`;
    }
    const dateTimeStr = `${endDate}T${timePart.length <= 5 ? timePart + ':00' : timePart}`;
    try {
      const d = new Date(dateTimeStr);
      if (!isNaN(d.getTime())) {
        return dateFormatted + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    } catch {
      return `${dateFormatted} ${timePart}`;
    }
    return `${dateFormatted} ${timePart}`;
  }

  private formatDateOnly(value: string): string {
    if (!value) return 'N/A';
    try {
      const d = new Date(value + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch {
      return value;
    }
    return value;
  }

  formatDateReprint(value: string | undefined | null): string {
    if (!value) return 'N/A';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return value;
    }
  }

  formatCurrencyReprint(amount: number | undefined | null, currency?: number): string {
    if (amount == null) return 'N/A';
    return '$ ' + Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

}

