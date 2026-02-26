import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { OpenTransactionService, CartonAmericaOrdenLlegada, OpenTransaction } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { UtilsService } from '../../../core/services/utils.service';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-orden-llegada-carton-america',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    TooltipModule
  ],
  templateUrl: './orden-llegada-carton-america.component.html',
  styleUrls: ['./orden-llegada-carton-america.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdenLlegadaCartonAmericaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private openTransactionService = inject(OpenTransactionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private pdfExportService = inject(PdfExportService);
  private enumService = inject(EnumService);
  private utilsService = inject(UtilsService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  list = signal<CartonAmericaOrdenLlegada[]>([]);
  /** Nombre de la empresa (usuario logueado). */
  companyName = signal<string>('');
  /** Cantidad total de vehículos (calculada a partir de la lista). */
  cantidad = signal<number>(0);
  /** Nombre del usuario actual para la barra de datos */
  userName = signal<string>('');

  /** Separa las notas por '/' para visualización estructurada. */
  getNotesParts(notes: string | undefined): string[] {
    if (!notes || !notes.trim()) return [];
    return notes.split('/').map(p => p.trim()).filter(p => p.length > 0);
  }

  /** Notas ligeras para columna Detalle: primeras partes, truncadas. */
  getNotesLight(notes: string | undefined, maxParts = 2, maxLen = 40): string {
    const parts = this.getNotesParts(notes);
    if (parts.length === 0) return '-';
    const joined = parts.slice(0, maxParts).join(' · ');
    return joined.length > maxLen ? joined.slice(0, maxLen) + '…' : joined;
  }

  /** Detalle en dos líneas: L1 Carga (proveedor, cantidad, ciudad), L2 Conductor (documento, nombre, tel). */
  getNotesTwoLines(notes: string | undefined): { line1: string; line2: string } {
    const parts = this.getNotesParts(notes);
    if (parts.length === 0) return { line1: '-', line2: '' };
    const line1Parts = [parts[0], parts[1], parts[2]].filter(p => p);
    const line1 = line1Parts.length ? line1Parts.join(' · ') : '-';
    const docPart = parts[3] || '';
    const line2Parts = [docPart, parts[4], parts[5]].filter(p => p);
    const line2 = line2Parts.length ? line2Parts.join(' · ') : '';
    return { line1: line1 || '-', line2 };
  }

  /** Estructura sectorizada: proveedor, cantidad paquetes, ciudad, tipo documento, documento conductor, nombre, teléfono. */
  getDetalleSectores(notes: string | undefined): {
    proveedor: string;
    cantidadPaquetes: string;
    ciudad: string;
    tipoDocumento: string;
    documentoConductor: string;
    nombreConductor: string;
    telefono: string;
    rawParts: string[];
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
      telefono: parts[5] ?? '-',
      rawParts: parts
    };
  }

  showEditDialog = signal(false);
  editingRow = signal<CartonAmericaOrdenLlegada | null>(null);
  vehicleToEdit = signal<OpenTransaction | null>(null);
  vehicleTypeEnums = signal<EnumResource[]>([]);
  savingEdit = signal(false);
  showDetalleDialog = signal(false);
  detalleRow = signal<CartonAmericaOrdenLlegada | null>(null);

  editForm!: FormGroup;
  cartonAmericaNotesForm!: FormGroup;

  static readonly CARTON_AMERICA_TIPO_IDS = ['DBLTR_C_AMER', 'TRACQ_C_AMER', 'CAMION_C_AMERICA'];

  get editTipoOptions(): { label: string; value: string }[] {
    return this.vehicleTypeEnums().map(e => ({ label: e.description || e.id || '', value: e.id || '' })).filter(o => o.value);
  }

  /** Indica si el tipo de vehículo seleccionado es Cartón América. */
  get isCartonAmericaTipo(): boolean {
    const id = this.editForm?.get('tipoVehiculoId')?.value;
    if (!id) return false;
    const idStr = String(id);
    if (OrdenLlegadaCartonAmericaComponent.CARTON_AMERICA_TIPO_IDS.includes(idStr)) return true;
    const label = (this.editTipoOptions.find(o => String(o.value) === idStr)?.label ?? '').toLowerCase();
    return label.includes('carton') && label.includes('america');
  }

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

  private notesProveedorValidator = (c: AbstractControl): { [key: string]: boolean } | null => {
    const v = (c.value || '').trim();
    if (!v) return null;
    if (/^\d+$/.test(v)) return { notesProveedor: true };
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

  private setupCartonAmericaNotesSync(): void {
    this.cartonAmericaNotesForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (!this.isCartonAmericaTipo) return;
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
      this.editForm.patchValue({ notes: parts.filter(p => p).join(' / ') }, { emitEvent: false });
    });
    this.editForm.get('tipoVehiculoId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncCartonAmericaNotesFromNotes());
  }

  private syncCartonAmericaNotesFromNotes(): void {
    if (!this.isCartonAmericaTipo) {
      this.cartonAmericaNotesForm.reset({
        proveedor: '', cantidadPaquetes: '', ciudad: '',
        tipoDocumento: '', documentoConductor: '', nombreConductor: '', telefono: ''
      }, { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }
    const notes = this.editForm.get('notes')?.value || '';
    const parts = this.getNotesParts(notes);
    const parte3 = parts[3] ?? '';
    const sep = parte3.indexOf(' - ');
    const [tipoDoc, docCond] = sep >= 0 ? [parte3.substring(0, sep).trim(), parte3.substring(sep + 3).trim()] : [parte3, ''];
    this.cartonAmericaNotesForm.patchValue({
      proveedor: parts[0] ?? '',
      cantidadPaquetes: parts[1] ?? '',
      ciudad: parts[2] ?? '',
      tipoDocumento: tipoDoc,
      documentoConductor: docCond,
      nombreConductor: parts[4] ?? '',
      telefono: parts[5] ?? ''
    }, { emitEvent: false });
    Object.keys(this.cartonAmericaNotesForm.controls).forEach(k => this.cartonAmericaNotesForm.get(k)?.updateValueAndValidity());
    this.cdr.markForCheck();
  }

  onCartonNotesFieldInput(event: Event, controlName: string): void {
    const target = event.target as HTMLInputElement;
    const upper = (target.value || '').toUpperCase();
    if (target.value !== upper) this.cartonAmericaNotesForm.get(controlName)?.setValue(upper);
  }

  private getVehicleTypeId(vehicle: OpenTransaction): string | null {
    const t = vehicle.basicVehicleType ?? vehicle.tipoVehiculo;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    return (t as EnumResource).id ?? null;
  }

  private parseDateAsLocal(dateString: string): Date | null {
    const m = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      return isNaN(date.getTime()) ? null : date;
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  }

  private toDateInputValue(dateStr: string): string {
    if (!dateStr?.trim()) return '';
    const parsed = this.parseDateAsLocal(dateStr);
    if (!parsed) return dateStr.substring(0, 10);
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toTimeInputValue(timeStr: string): string {
    if (!timeStr?.trim()) return '';
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return '';
    let h = parseInt(match[1], 10);
    const min = match[2];
    if (match[4]) {
      if (match[4].toUpperCase() === 'PM' && h !== 12) h += 12;
      else if (match[4].toUpperCase() === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${min}:00`.substring(0, 5);
  }

  ngOnInit(): void {
    this.loadCompanyInfo();
    this.loadVehicleTypeEnums();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVehicleTypeEnums(): void {
    this.enumService.getEnumByName('ETipoVehiculo').subscribe(enums => {
      this.vehicleTypeEnums.set(enums || []);
    });
  }

  private loadCompanyInfo(): void {
    const userData = this.authService.getUserData();
    this.companyName.set(userData?.companyName ?? userData?.companyDescription ?? '');
    const first = userData?.firstName ?? '';
    const last = userData?.lastName ?? '';
    this.userName.set(`${first} ${last}`.trim() || '—');
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.openTransactionService.getCartonAmericaOrdenLlegada()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const arr = data ?? [];
          this.list.set(arr);
          this.cantidad.set(arr.length);
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.message || 'Error al cargar orden de llegada');
          this.list.set([]);
          this.cantidad.set(0);
        }
      });
  }

  formatDateTime(value: string | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  }

  openEditDialog(row: CartonAmericaOrdenLlegada): void {
    this.editingRow.set(row);
    if (!row.openTransactionId) {
      this.notificationService.error('No se puede editar: ID no disponible', 'Error');
      return;
    }
    // Usar datos de la tabla (getById devuelve 403 Forbidden)
    this.vehicleToEdit.set({
      openTransactionId: row.openTransactionId,
      vehiclePlate: row.vehiclePlate,
      startDay: row.startDay,
      startTime: row.startTime,
      operationDate: row.operationDate,
      notes: row.notes
    });
    const tipoId = this.findTipoIdByLabel(row.tipoVehiculoLabel);
    const startDay = row.startDay || row.operationDate || '';
    this.editForm.patchValue({
      vehiclePlate: (row.vehiclePlate || '').trim(),
      tipoVehiculoId: tipoId || '',
      startDay: this.toDateInputValue(startDay),
      startTime: this.toTimeInputValue(row.startTime || ''),
      notes: row.notes || '',
      bySubscription: false
    });
    this.syncCartonAmericaNotesFromNotes();
    this.showEditDialog.set(true);
  }

  private findTipoIdByLabel(label: string | undefined): string | null {
    if (!label?.trim()) return null;
    const q = label.trim().toLowerCase();
    const opt = this.editTipoOptions.find(o => (o.label || '').toLowerCase() === q || (o.label || '').toLowerCase().includes(q));
    return opt?.value ?? null;
  }

  closeEditDialog(): void {
    this.showEditDialog.set(false);
    this.editingRow.set(null);
    this.vehicleToEdit.set(null);
    this.editForm.reset({ vehiclePlate: '', tipoVehiculoId: '', startDay: '', startTime: '', notes: '', bySubscription: false });
    this.cartonAmericaNotesForm.reset({
      proveedor: '', cantidadPaquetes: '', ciudad: '',
      tipoDocumento: '', documentoConductor: '', nombreConductor: '', telefono: ''
    });
  }

  openDetalleDialog(row: CartonAmericaOrdenLlegada): void {
    this.detalleRow.set(row);
    this.showDetalleDialog.set(true);
  }

  openEditFromDetalle(row: CartonAmericaOrdenLlegada): void {
    this.closeDetalleDialog();
    this.openEditDialog(row);
  }

  closeDetalleDialog(): void {
    this.showDetalleDialog.set(false);
    this.detalleRow.set(null);
  }

  /** Exporta la lista actual a PDF (descarga directa). */
  exportToPdf(): void {
    const rows = this.list();
    if (rows.length === 0) {
      this.notificationService.warn('No hay datos para exportar', 'Advertencia');
      return;
    }
    try {
      const data = rows.map(row => ({
        ordenDeLlegada: row.ordenDeLlegada,
        vehiclePlate: row.vehiclePlate ?? '-',
        tipoVehiculoLabel: row.tipoVehiculoLabel ?? '-',
        operationDate: row.operationDate,
        notes: row.notes ?? '-'
      }));
      this.pdfExportService.export({
        title: 'Cartón América - Orden de llegada',
        subtitle: 'Vehículos en parqueadero ordenados por fecha y hora de ingreso',
        companyName: this.companyName() || undefined,
        columns: [
          { header: 'Orden de llegada', dataKey: 'ordenDeLlegada' },
          { header: 'Placa', dataKey: 'vehiclePlate' },
          { header: 'Tipo de vehículo', dataKey: 'tipoVehiculoLabel' },
          { header: 'Fecha y hora de ingreso', dataKey: 'operationDate', format: v => PdfExportService.formatDateTime(v as string) },
          { header: 'Datos informativos del vehículo', dataKey: 'notes' }
        ],
        data,
        filename: PdfExportService.getExportFileName('Orden-Llegada-Carton-America'),
        primaryColor: '#5C1A1A'
      });
      this.notificationService.success('PDF exportado correctamente', 'Éxito');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      this.notificationService.error('Error al generar el PDF', 'Error');
    }
  }

  saveEdit(): void {
    const vehicle = this.vehicleToEdit();
    if (!vehicle?.openTransactionId) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.utilsService.confirm({
      message: '¿Confirma guardar los cambios en esta operación?',
      header: 'Confirmar edición'
    }).pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.savingEdit.set(true);
      const desc = v.tipoVehiculoId ? (this.editTipoOptions.find(o => o.value === v.tipoVehiculoId)?.label ?? '') : '';
      const tipo = v.tipoVehiculoId ? { id: v.tipoVehiculoId, description: desc } : undefined;
      const startTime = v.startTime ? (v.startTime.length >= 5 ? v.startTime + ':00' : v.startTime) : undefined;
      const operationDate = v.startDay && v.startTime ? `${v.startDay} ${String(v.startTime).substring(0, 5)}` : undefined;
      // Endpoint parcial: solo actualiza estos campos; backend preserva status, amount, etc.
      const payload = {
        openTransactionId: vehicle.openTransactionId!,
        vehiclePlate: (v.vehiclePlate || '').trim().toUpperCase(),
        tipoVehiculo: tipo,
        basicVehicleType: tipo,
        startDay: v.startDay || undefined,
        startTime,
        operationDate,
        notes: v.notes ?? undefined,
        bySubscription: !!v.bySubscription
      };
      this.openTransactionService.updateCartonAmericaOrdenLlegada(payload)
        .pipe(finalize(() => this.savingEdit.set(false)))
        .subscribe({
          next: () => {
            this.closeEditDialog();
            this.load();
            this.notificationService.success('Operación actualizada correctamente', 'Éxito');
          },
          error: (err) => {
            this.error.set(err?.error?.message || err?.message || 'Error al actualizar');
          }
        });
    });
  }
}
