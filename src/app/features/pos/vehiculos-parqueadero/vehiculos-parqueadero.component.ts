import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { Popover, PopoverModule } from 'primeng/popover';
import { OpenTransactionService, OpenTransaction, ParamVenta } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { PrintService } from '../../../core/services/print.service';
import { UtilsService } from '../../../core/services/utils.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil, finalize, catchError, of, EMPTY } from 'rxjs';
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
    CheckboxModule,
    TooltipModule,
    PopoverModule
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
  private pdfExportService = inject(PdfExportService);
  private notificationService = inject(NotificationService);
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
  deletingId = signal<number | null>(null);
  exportPdfLoading = signal(false);
  paginatorFirst = signal(0);
  paginatorRows = signal(10);
  private searchTerm$ = new Subject<string>();

  /** Modal editar operación */
  editModalVisible = signal(false);
  vehicleToEdit = signal<OpenTransaction | null>(null);
  savingEdit = signal(false);
  editForm!: FormGroup;

  /** Overlay "Ver detalles" al hacer click en fila */
  detalleVehicle = signal<OpenTransaction | null>(null);

  sellerId = computed(() => {
    const userData = this.authService.getUserData();
    return userData?.appUserId || null;
  });

  /** Solo estos roles pueden ver el botón Eliminar: ADMIN_APP, ADMINISTRATOR_PRINCIPAL, ADMINISTRADOR_EMPRESA. */
  get canDeleteVehicle(): boolean {
    return (
      this.authService.hasRole('ADMIN_APP') ||
      this.authService.hasRole('ADMINISTRATOR_PRINCIPAL') ||
      this.authService.hasRole('ADMINISTRADOR_EMPRESA') ||
      this.authService.hasRole('administratod_empresa')
    );
  }

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
    this.cartonAmericaNotesForm = this.fb.group({
      proveedor: ['', [this.notesProveedorValidator]],
      cantidadPaquetes: ['', [this.notesCantidadPaquetesValidator]],
      ciudad: ['', [this.notesCiudadValidator]],
      tipoDocumento: ['', [this.notesTipoDocumentoValidator]],
      documentoConductor: [''],
      nombreConductor: ['', [this.notesNombreConductorValidator]],
      telefono: ['', [this.notesTelefonoValidator]]
    });
    this.setupCartonAmericaNotesSync();
  }

  private setupCartonAmericaNotesSync(): void {
    this.cartonAmericaNotesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        const tipo = (val.tipoDocumento || '').trim();
        const doc = (val.documentoConductor || '').trim();
        const parteTipoDoc = tipo && doc ? `${tipo} - ${doc}` : (tipo || doc);
        const parts = [
          (val.proveedor || '').trim(),
          (val.cantidadPaquetes || '').trim(),
          (val.ciudad || '').trim(),
          parteTipoDoc,
          (val.nombreConductor || '').trim(),
          (val.telefono || '').trim()
        ];
        const notes = parts.filter(p => p).join(' / ');
        this.editForm.patchValue({ notes }, { emitEvent: false });
      });
    this.editForm.get('tipoVehiculoId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncCartonAmericaNotesFromNotes());
  }

  /** Validadores para notas Cartón América (opcionales: vacío = válido). */
  private notesProveedorValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    if (/^\d+$/.test(v)) return { notesProveedor: true }; // nunca solo números
    if (!/^[A-Za-z0-9ÁáÉéÍíÓóÚúÑñ\s\-.,]+$/.test(v)) return { notesProveedor: true };
    return null;
  };
  private notesCantidadPaquetesValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    return /^\d+$/.test(v) ? null : { notesCantidadPaquetes: true };
  };
  private notesCiudadValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    return /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s\-']+$/.test(v) ? null : { notesCiudad: true };
  };
  private notesTipoDocumentoValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    return /^[A-Za-z]{1,3}$/.test(v) ? null : { notesTipoDocumento: true };
  };
  private notesNombreConductorValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    const parts = v.split(/\s+/).filter((p: string) => p);
    return parts.length >= 1 && parts.length <= 4 && parts.every((p: string) => /^[A-Za-zÁáÉéÍíÓóÚúÑñ]+$/.test(p))
      ? null : { notesNombreConductor: true };
  };
  private notesTelefonoValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    return /^\d+$/.test(v) ? null : { notesTelefono: true };
  };

  /** Convierte a mayúsculas el campo de notas Cartón América en cada input. */
  onCartonNotesFieldInput(event: Event, controlName: string): void {
    const target = event.target as HTMLInputElement;
    const upper = (target.value || '').toUpperCase();
    if (target.value !== upper) {
      this.cartonAmericaNotesForm.get(controlName)?.setValue(upper);
    }
  }

  /** Parsea notes y rellena cartonAmericaNotesForm. */
  private syncCartonAmericaNotesFromNotes(): void {
    if (!this.isCartonAmericaTipo) {
      this.cartonAmericaNotesForm.reset({
        proveedor: '', cantidadPaquetes: '', ciudad: '',
        tipoDocumento: '', documentoConductor: '', nombreConductor: '', telefono: ''
      }, { emitEvent: false });
      return;
    }
    const notes = this.editForm.get('notes')?.value || '';
    const parts = this.getNotesParts(notes);
    const parte3 = parts[3] ?? '';
    const sep = parte3.indexOf(' - ');
    const [tipoDoc, docCond] = sep >= 0
      ? [parte3.substring(0, sep).trim(), parte3.substring(sep + 3).trim()]
      : [parte3, ''];
    this.cartonAmericaNotesForm.patchValue({
      proveedor: parts[0] ?? '',
      cantidadPaquetes: parts[1] ?? '',
      ciudad: parts[2] ?? '',
      tipoDocumento: tipoDoc,
      documentoConductor: docCond,
      nombreConductor: parts[4] ?? '',
      telefono: parts[5] ?? ''
    }, { emitEvent: false });
    Object.keys(this.cartonAmericaNotesForm.controls).forEach(k => {
      this.cartonAmericaNotesForm.get(k)?.updateValueAndValidity();
    });
    this.cdr.markForCheck();
  }

  /** IDs de tipo Cartón América (enum ETipoVehiculo): DBLTR_C_AMER, TRACQ_C_AMER, CAMION_C_AMERICA. */
  static readonly CARTON_AMERICA_TIPO_IDS = ['DBLTR_C_AMER', 'TRACQ_C_AMER', 'CAMION_C_AMERICA'];

  /** Indica si el tipo de vehículo seleccionado es Cartón América. */
  get isCartonAmericaTipo(): boolean {
    const id = this.editForm?.get('tipoVehiculoId')?.value;
    if (!id) return false;
    const idStr = String(id);
    if (VehiculosParqueaderoComponent.CARTON_AMERICA_TIPO_IDS.includes(idStr)) return true;
    const label = (this.editTipoOptions.find(o => String(o.value) === idStr)?.label ?? '').toLowerCase();
    return label.includes('carton') && label.includes('america');
  }

  /** Formulario estructurado para notas Cartón América. */
  cartonAmericaNotesForm!: FormGroup;

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

  /** Indica si el vehículo es tipo Cartón América (para mostrar secciones Carga/Conductor en el popover). */
  isCartonAmericaVehicle(vehicle: OpenTransaction): boolean {
    const id = this.getVehicleTypeId(vehicle);
    if (id && VehiculosParqueaderoComponent.CARTON_AMERICA_TIPO_IDS.includes(id)) return true;
    const label = (this.getVehicleTypeDisplay(vehicle.basicVehicleType ?? vehicle.tipoVehiculo) || '').toLowerCase();
    return label.includes('carton') && label.includes('america');
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

  /** Elimina la transacción abierta (administrativo). */
  deleteVehicle(vehicle: OpenTransaction): void {
    const id = vehicle.openTransactionId;
    if (id == null) {
      this.error.set('No se puede eliminar: ID no disponible');
      this.cdr.markForCheck();
      return;
    }
    this.utilsService
      .confirm({
        message: `¿Eliminar la operación de la placa ${vehicle.vehiclePlate || 'N/A'}? Esta acción no se puede deshacer.`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.deletingId.set(id);
        this.error.set(null);
        this.cdr.markForCheck();
        this.openTransactionService
          .delete(id)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.deletingId.set(null);
              this.cdr.markForCheck();
            }),
            catchError((err: unknown) => {
              const msg =
                (err as { error?: { readableMsg?: string; message?: string } })?.error?.readableMsg ??
                (err as { error?: { message?: string } })?.error?.message ??
                'Error al eliminar';
              this.error.set(msg);
              this.cdr.markForCheck();
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.utilsService.showSuccess('Operación eliminada correctamente');
              this.loadPage(Math.floor(this.paginatorFirst() / this.paginatorRows()), this.paginatorRows());
              this.loadCountByType();
            },
          });
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
    this.syncCartonAmericaNotesFromNotes();
    this.editModalVisible.set(true);
    this.cdr.markForCheck();
  }

  /** Abre overlay de detalle al hacer click en fila. */
  openDetalleOverlay(vehicle: OpenTransaction, event: Event, op: Popover): void {
    this.detalleVehicle.set(vehicle);
    op.toggle(event);
  }

  /** Notas ligeras para vista resumida. */
  getNotesLight(notes: string | undefined, maxParts = 2, maxLen = 40): string {
    const parts = this.getNotesParts(notes);
    if (parts.length === 0) return '-';
    const joined = parts.slice(0, maxParts).join(' · ');
    return joined.length > maxLen ? joined.slice(0, maxLen) + '…' : joined;
  }

  /** Estructura sectorizada de notas (proveedor, ciudad, conductor, etc.). */
  getDetalleSectores(notes: string | undefined): {
    proveedor: string;
    cantidadPaquetes: string;
    ciudad: string;
    tipoDocumento: string;
    documentoConductor: string;
    nombreConductor: string;
    telefono: string;
  } {
    const parts = this.getNotesParts(notes);
    const parte3 = parts[3] ?? '';
    const sep = parte3.indexOf(' - ');
    const [tipoDoc, docCond] = sep >= 0
      ? [parte3.substring(0, sep).trim(), parte3.substring(sep + 3).trim()]
      : [parte3, ''];
    return {
      proveedor: parts[0] ?? '-',
      cantidadPaquetes: parts[1] ?? '-',
      ciudad: parts[2] ?? '-',
      tipoDocumento: tipoDoc || '-',
      documentoConductor: docCond || '-',
      nombreConductor: parts[4] ?? '-',
      telefono: parts[5] ?? '-'
    };
  }

  formatDateTime(value: string | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  }

  /** Separa las notas por '/' y devuelve cada parte sin espacios extra (para visualización estructurada). */
  getNotesParts(notes: string | undefined): string[] {
    if (!notes || !notes.trim()) return [];
    return notes
      .split('/')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /** Cierra el modal de edición sin guardar. */
  closeEditModal(): void {
    this.editModalVisible.set(false);
    this.vehicleToEdit.set(null);
    this.editForm.reset({ vehiclePlate: '', tipoVehiculoId: '', startDay: '', startTime: '', notes: '', bySubscription: false });
    this.cartonAmericaNotesForm.reset({
      proveedor: '', cantidadPaquetes: '', ciudad: '',
      tipoDocumento: '', documentoConductor: '', nombreConductor: '', telefono: ''
    });
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

  /** Exporta vehículos actuales (todos los que coinciden con la búsqueda) a PDF. */
  exportToPdf(): void {
    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;
    if (!companyId) {
      this.notificationService.warn('No se pudo obtener la empresa', 'Advertencia');
      return;
    }
    if (this.totalRecords() === 0) {
      this.notificationService.warn('No hay datos para exportar', 'Advertencia');
      return;
    }
    this.exportPdfLoading.set(true);
    this.cdr.markForCheck();
    const plateFilter = this.searchTerm().trim() || undefined;
    this.openTransactionService
      .getPage({ companyId, page: 0, size: 5000, vehiclePlate: plateFilter })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.exportPdfLoading.set(false);
          this.cdr.markForCheck();
        }),
        catchError(() => {
          this.notificationService.error('Error al cargar datos para exportar', 'Error');
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          const content = response?.content ?? [];
          if (content.length === 0) {
            this.notificationService.warn('No hay datos para exportar', 'Advertencia');
            return;
          }
          const companyName = (userData?.companyName ?? userData?.companyDescription ?? '') || undefined;
          const data = content.map(v => ({
            vehiclePlate: v.vehiclePlate ?? '-',
            tipoLabel: this.getVehicleTypeDisplay(v.basicVehicleType ?? v.tipoVehiculo),
            startDay: v.startDay ?? v.operationDate ?? '-',
            startTime: v.startTime ?? '-',
            bySubscription: v.bySubscription ? 'Sí' : 'No',
            notes: v.notes ?? '-'
          }));
          this.pdfExportService.export({
            title: 'Vehículos en Parqueadero',
            subtitle: 'Reporte de vehículos en parqueadero',
            companyName,
            columns: [
              { header: 'Placa', dataKey: 'vehiclePlate' },
              { header: 'Tipo de vehículo', dataKey: 'tipoLabel' },
              { header: 'Fecha ingreso', dataKey: 'startDay' },
              { header: 'Hora ingreso', dataKey: 'startTime' },
              { header: 'Por suscripción', dataKey: 'bySubscription' },
              { header: 'Notas', dataKey: 'notes' }
            ],
            data,
            filename: PdfExportService.getExportFileName('Vehiculos-Parqueadero'),
            primaryColor: '#1976d2'
          });
          this.notificationService.success('PDF exportado correctamente', 'Éxito');
        }
      });
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
