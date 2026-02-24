import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { OpenTransactionService, OpenTransaction, ParamVenta } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { PrintService } from '../../../core/services/print.service';
import { UtilsService } from '../../../core/services/utils.service';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehiculos-parqueadero',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    DialogModule,
    CheckboxModule
  ],
  templateUrl: './vehiculos-parqueadero.component.html',
  styleUrls: ['./vehiculos-parqueadero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiculosParqueaderoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private openTransactionService = inject(OpenTransactionService);
  private closedTransactionService = inject(ClosedTransactionService);
  private printService = inject(PrintService);
  private authService = inject(AuthService);
  private enumService = inject(EnumService);
  private shiftService = inject(ShiftService);
  private utilsService = inject(UtilsService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  /** Contenido de la página actual (paginación lazy como en t-parking). */
  filteredVehicles = signal<OpenTransaction[]>([]);
  /** Total de registros devuelto por el backend (para el paginador). */
  totalRecords = signal(0);
  /** Enums ETipoVehiculo para filtrar el conteo por tipo. */
  vehicleTypeEnums = signal<EnumResource[]>([]);
  /** Conteo por tipo de vehículo (solo estado abierto), filtrado por ETipoVehiculo. */
  countByTypeList = signal<{ typeName: string; count: number }[]>([]);
  loadingCounts = signal(false);
  searchTerm = signal<string>('');
  currentShift = signal<DShiftAssignment | null>(null);
  reprintingId = signal<number | null>(null);
  paginatorFirst = signal(0);
  paginatorRows = signal(10);
  private searchTerm$ = new Subject<string>();

  /** Modal editar operación */
  editModalVisible = signal(false);
  vehicleToEdit = signal<OpenTransaction | null>(null);
  savingEdit = signal(false);
  editForm!: FormGroup;

  sellerId = computed(() => {
    const userData = this.authService.getUserData();
    return userData?.appUserId || null;
  });

  /** Nombre del usuario para la barra de datos (mismo uso que orden-llegada-carton-america). */
  userName = computed(() => {
    const d = this.authService.getUserData();
    const first = d?.firstName ?? '';
    const last = d?.lastName ?? '';
    return `${first} ${last}`.trim() || 'Usuario';
  });

  constructor() {
    this.editForm = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(8)]],
      tipoVehiculoId: ['', Validators.required],
      startDay: ['', Validators.required],
      startTime: [''],
      notes: [''],
      bySubscription: [false]
    });
  }

  /** Opciones para el select de tipo de vehículo en el modal editar. */
  get editTipoOptions(): { label: string; value: string }[] {
    return this.vehicleTypeEnums().map(e => ({
      label: e.description || e.id || '',
      value: e.id || ''
    })).filter(o => o.value);
  }

  ngOnInit(): void {
    this.loadVehicleTypeEnums();
    this.loadCurrentShift();
    this.setupSearchDebounce();
    this.loadPage(0, this.paginatorRows());
    this.loadCountByType();
    this.setupEventListeners();
  }

  /** Carga los enums ETipoVehiculo y refresca el conteo por tipo. */
  private loadVehicleTypeEnums(): void {
    this.enumService.getEnumByName('ETipoVehiculo')
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe(enums => {
        this.vehicleTypeEnums.set(enums || []);
        this.cdr.markForCheck();
        this.loadCountByType();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchTerm$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.paginatorFirst.set(0);
        this.loadPage(0, this.paginatorRows());
      });
  }

  private setupEventListeners(): void {
    window.addEventListener('vehicleRegistered', () => {
      this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
      this.loadCountByType();
    });
    window.addEventListener('transactionClosed', () => {
      this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
      this.loadCountByType();
    });
  }

  private loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    // Obtener información del turno activo desde params
    const serviceCode = environment.serviceCode;
    this.closedTransactionService.getParams(serviceCode)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe({
        next: (params: ParamVenta | null) => {
          const shiftHistory = params?.dshiftConnectionHistory;
          const shift = shiftHistory?.shift;
          if (shift && shiftHistory?.shiftAssignmentId) {
            const shiftAssignment: DShiftAssignment = {
              shiftAssignmentId: shiftHistory.shiftAssignmentId,
              shiftId: shiftHistory.shiftId || shift.shiftId,
              shift: shift,
              appUserId: shiftHistory.appUserId,
              status: shift.status || { id: 'CONFIRMED', description: 'Turno confirmado' }
            };
            this.currentShift.set(shiftAssignment);
          } else {
            this.currentShift.set(null);
          }
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Carga una página desde el backend (paginación lazy como en t-parking).
   * Actualiza filteredVehicles con content y totalRecords con totalElements.
   */
  loadPage(page: number, size: number): void {
    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;

    if (!companyId) {
      this.error.set('No se pudo obtener la información de la empresa');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const plateFilter = this.searchTerm().trim() || undefined;

    this.openTransactionService
      .getPage({ companyId, page, size, vehiclePlate: plateFilter })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err: any) => {
          const errorResponse = err?.error;
          this.error.set(errorResponse?.readableMsg || errorResponse?.message || 'Error al cargar vehículos');
          this.filteredVehicles.set([]);
          this.totalRecords.set(0);
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (!response) return;
          const content = response.content || [];
          const total = response.totalElements ?? 0;
          this.filteredVehicles.set(content);
          this.totalRecords.set(total);
          this.paginatorFirst.set(page * size);
          this.paginatorRows.set(size);
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.searchTerm$.next(target.value);
  }

  onLazyLoad(event: { first?: number | null; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.paginatorRows();
    const page = Math.floor(first / rows);
    if (this.paginatorFirst() !== first || this.paginatorRows() !== rows) {
      this.loadPage(page, rows);
    }
  }

  refresh(): void {
    this.paginatorFirst.set(0);
    this.loadPage(0, this.paginatorRows());
    this.loadCountByType();
  }

  /**
   * Carga todos los vehículos en estado abierto (hasta un límite) y agrega conteo por tipo,
   * filtrado por los enums ETipoVehiculo (solo tipos que existan en el enum).
   */
  private loadCountByType(): void {
    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;
    if (!companyId) return;

    this.loadingCounts.set(true);
    this.cdr.markForCheck();

    this.openTransactionService
      .getPage({ companyId, page: 0, size: 2000 })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingCounts.set(false);
          this.cdr.markForCheck();
        }),
        catchError(() => of(null))
      )
      .subscribe({
        next: (response) => {
          const enums = this.vehicleTypeEnums();
          if (!response?.content) {
            this.countByTypeList.set(this.buildCountListByEnums(new Map(), enums));
            return;
          }
          const countsById = new Map<string, number>();
          for (const v of response.content) {
            const typeId = this.getVehicleTypeId(v);
            if (typeId != null) {
              countsById.set(typeId, (countsById.get(typeId) ?? 0) + 1);
            }
          }
          this.countByTypeList.set(this.buildCountListByEnums(countsById, enums));
        }
      });
  }

  /** Obtiene el id del tipo de vehículo (para cruzar con ETipoVehiculo). */
  private getVehicleTypeId(vehicle: OpenTransaction): string | null {
    const t = vehicle.basicVehicleType ?? vehicle.tipoVehiculo;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    return (t as EnumResource).id ?? null;
  }

  /** Arma la lista de conteo solo para los enums ETipoVehiculo con al menos un vehículo. Cartón América al final; el resto por count desc. */
  private buildCountListByEnums(countsById: Map<string, number>, enums: EnumResource[]): { typeName: string; count: number }[] {
    const list = enums
      .map(e => ({ typeName: e.description || e.id, count: countsById.get(e.id) ?? 0 }))
      .filter(x => x.count > 0);
    const hasCartonAmerica = (name: string) => (name || '').toLowerCase().includes('carton') && (name || '').toLowerCase().includes('america');
    return list.sort((a, b) => {
      const aCarton = hasCartonAmerica(a.typeName);
      const bCarton = hasCartonAmerica(b.typeName);
      if (aCarton !== bCarton) return aCarton ? 1 : -1;
      return b.count - a.count;
    });
  }

  /** Icono alusivo al tipo de vehículo (PrimeIcons). */
  getIconForVehicleType(typeName: string): string {
    const t = (typeName || '').toLowerCase();
    if (t.includes('tractomula') || t.includes('tractocamión') || t.includes('tracto')) return 'pi pi-truck';
    if (t.includes('camión') || t.includes('camion')) return 'pi pi-truck';
    if (t.includes('moto')) return 'pi pi-bolt';
    if (t.includes('bicicleta') || t.includes('bici')) return 'pi pi-bolt';
    if (t.includes('carro') || t.includes('automóvil') || t.includes('automovil') || t.includes('sedan')) return 'pi pi-car';
    return 'pi pi-car';
  }

  /**
   * Reimprime la tirilla de ingreso del vehículo: consulta al backend la data actual,
   * genera DDataPrinting (buildTicket) y la envía al servicio de impresión (parking-printing).
   */
  reprintTicket(vehicle: OpenTransaction): void {
    const id = vehicle.openTransactionId;
    if (id == null) {
      this.error.set('No se puede reimprimir: ID de transacción no disponible');
      this.cdr.markForCheck();
      return;
    }
    this.reprintingId.set(id);
    this.error.set(null);
    this.cdr.markForCheck();

    this.openTransactionService.getReprintTicketData(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.reprintingId.set(null);
          this.cdr.markForCheck();
        }),
        catchError((err: unknown) => {
          const msg = (err as { error?: { message?: string; readableMsg?: string } })?.error?.readableMsg
            ?? (err as { error?: { message?: string } })?.error?.message
            ?? 'Error al obtener datos para reimprimir';
          this.error.set(msg);
          this.cdr.markForCheck();
          return of(null);
        })
      )
      .subscribe({
        next: (buildTicket) => {
          if (!buildTicket?.template) {
            this.error.set('No se recibieron datos de impresión');
            this.cdr.markForCheck();
            return;
          }
          this.printService.printTicket(buildTicket)
            .pipe(
              takeUntil(this.destroy$),
              catchError((printErr: unknown) => {
                const printMsg = (printErr as { error?: string; message?: string })?.error
                  ?? (printErr as { message?: string })?.message
                  ?? 'Error al enviar a la impresora';
                this.error.set(printMsg);
                this.cdr.markForCheck();
                return of(null);
              })
            )
            .subscribe({
              next: () => {
                this.error.set(null);
                this.cdr.markForCheck();
              }
            });
        }
      });
  }

  /** Abre el modal de edición con los datos del vehículo. */
  openEditModal(vehicle: OpenTransaction): void {
    const id = this.getVehicleTypeId(vehicle);
    this.vehicleToEdit.set(vehicle);
    const startDay = vehicle.startDay || vehicle.operationDate || '';
    const dayForInput = this.toDateInputValue(startDay);
    const startTime = vehicle.startTime || '';
    const timeForInput = this.toTimeInputValue(startTime);
    this.editForm.patchValue({
      vehiclePlate: (vehicle.vehiclePlate || '').trim(),
      tipoVehiculoId: id || '',
      startDay: dayForInput,
      startTime: timeForInput,
      notes: vehicle.notes || '',
      bySubscription: !!vehicle.bySubscription
    });
    this.editModalVisible.set(true);
    this.cdr.markForCheck();
  }

  /** Cierra el modal de edición sin guardar. */
  closeEditModal(): void {
    this.editModalVisible.set(false);
    this.vehicleToEdit.set(null);
    this.editForm.reset({ vehiclePlate: '', tipoVehiculoId: '', startDay: '', startTime: '', notes: '', bySubscription: false });
    this.cdr.markForCheck();
  }

  /** Convierte fecha string (YYYY-MM-DD o ISO) a valor para input[type=date]. */
  private toDateInputValue(dateStr: string): string {
    if (!dateStr || !dateStr.trim()) return '';
    const parsed = this.parseDateAsLocal(dateStr);
    if (!parsed) return dateStr.substring(0, 10);
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Convierte hora string a HH:mm para input[type=time]. */
  private toTimeInputValue(timeStr: string): string {
    if (!timeStr || !timeStr.trim()) return '';
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return '';
    let h = parseInt(match[1], 10);
    const min = match[2];
    const sec = match[3] || '00';
    const ampm = match[4];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      else if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${min}:${sec}`.substring(0, 5);
  }

  /** Guarda los cambios de la operación tras confirmación. */
  saveEdit(): void {
    const vehicle = this.vehicleToEdit();
    if (!vehicle?.openTransactionId) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const v = this.editForm.value;
    this.utilsService.confirm({
      message: '¿Confirma guardar los cambios en esta operación?',
      header: 'Confirmar edición'
    }).pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.savingEdit.set(true);
      this.cdr.markForCheck();
      const payload: OpenTransaction = {
        ...vehicle,
        openTransactionId: vehicle.openTransactionId,
        vehiclePlate: (v.vehiclePlate || '').trim().toUpperCase(),
        tipoVehiculo: v.tipoVehiculoId ? { id: v.tipoVehiculoId, description: this.editTipoOptions.find(o => o.value === v.tipoVehiculoId)?.label ?? '' } : undefined,
        basicVehicleType: v.tipoVehiculoId ? { id: v.tipoVehiculoId, description: this.editTipoOptions.find(o => o.value === v.tipoVehiculoId)?.label ?? '' } : undefined,
        startDay: v.startDay || undefined,
        startTime: v.startTime ? (v.startTime.length >= 5 ? v.startTime + ':00' : v.startTime) : undefined,
        operationDate: v.startDay && v.startTime
          ? `${v.startDay} ${String(v.startTime).substring(0, 5)}`
          : vehicle.operationDate,
        notes: v.notes ?? undefined,
        bySubscription: !!v.bySubscription
      };
      this.openTransactionService.update(payload)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.savingEdit.set(false);
            this.cdr.markForCheck();
          }),
          catchError((err: unknown) => {
            const msg = (err as { error?: { readableMsg?: string; message?: string } })?.error?.readableMsg
              ?? (err as { error?: { message?: string } })?.error?.message ?? 'Error al actualizar';
            this.error.set(msg);
            this.cdr.markForCheck();
            return of(null);
          })
        )
        .subscribe(updated => {
          if (updated) {
            this.utilsService.showSuccess('Operación actualizada correctamente');
            this.closeEditModal();
            this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
            this.loadCountByType();
          }
        });
    });
  }

  getVehicleTypeDisplay(enumResource: EnumResource | string | null | undefined): string {
    if (!enumResource) return 'Desconocido';
    if (typeof enumResource === 'string') return enumResource;
    return enumResource.description || enumResource.id || 'Desconocido';
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return 'N/A';

    // Si ya viene formateado como hora (ej: "10:53:52 PM" o "22:53:52")
    if (timeString.includes(':') && !timeString.includes('T') && !timeString.includes('-')) {
      // Ya es una hora formateada, devolverla tal cual o formatearla mejor
      return timeString;
    }

    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        // Si no es una fecha válida, devolver el string original
        return timeString;
      }
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  }

  /**
   * Parsea una fecha en formato ISO (YYYY-MM-DD) o con hora como fecha local,
   * evitando el desfase de un día que produce new Date(string) al interpretar solo fecha como UTC.
   */
  private parseDateAsLocal(dateString: string): Date | null {
    const dateMatch = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const y = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10) - 1;
      const d = parseInt(dateMatch[3], 10);
      const date = new Date(y, m, d);
      return isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = this.parseDateAsLocal(dateString);
      if (!date) return dateString;
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  getTimeElapsed(vehicle: OpenTransaction): string {
    if (!vehicle.startTime) return 'N/A';

    try {
      let startDateTime: Date;
      const startTime = vehicle.startTime;
      const startDay = vehicle.startDay || vehicle.operationDate;

      // Si tenemos fecha y hora, combinarlas (parsear como fecha local para evitar desfase de un día)
      if (startDay) {
        let datePart: Date;
        const parsed = this.parseDateAsLocal(startDay);
        datePart = parsed ?? new Date();

        // Parsear la hora
        const timeParts = startTime.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const seconds = parseInt(timeParts[3]);
          const ampm = timeParts[4];

          // Convertir a formato 24 horas si es necesario
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours !== 12) {
              hours += 12;
            } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
              hours = 0;
            }
          }

          startDateTime = new Date(datePart);
          startDateTime.setHours(hours, minutes, seconds, 0);
        } else {
          // Si no se puede parsear la hora, usar solo la fecha
          startDateTime = datePart;
        }
      } else {
        // Si no hay fecha, intentar parsear startTime como fecha completa
        startDateTime = new Date(startTime);
        if (isNaN(startDateTime.getTime())) {
          return 'N/A';
        }
      }

      const now = new Date();
      const diff = now.getTime() - startDateTime.getTime();

      if (diff < 0) {
        return 'N/A';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch {
      return 'N/A';
    }
  }

  getShiftDisplayText(): string {
    const shiftAssignment = this.currentShift();
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
}
