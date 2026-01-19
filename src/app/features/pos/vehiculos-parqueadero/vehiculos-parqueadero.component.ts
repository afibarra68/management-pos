import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { OpenTransactionService, OpenTransaction } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ShiftService, DShiftAssignment } from '../../../core/services/shift.service';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-vehiculos-parqueadero',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    MessageModule,
    ButtonModule,
    InputTextModule,
    TagModule
  ],
  templateUrl: './vehiculos-parqueadero.component.html',
  styleUrls: ['./vehiculos-parqueadero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiculosParqueaderoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private openTransactionService = inject(OpenTransactionService);
  private authService = inject(AuthService);
  private enumService = inject(EnumService);
  private shiftService = inject(ShiftService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  vehicles = signal<OpenTransaction[]>([]);
  filteredVehicles = signal<OpenTransaction[]>([]);
  searchTerm = signal<string>('');
  currentShift = signal<DShiftAssignment | null>(null);
  companyName = signal<string>('');
  currentTime = signal<string>('');

  // Computed signals
  vehicleCount = computed(() => this.filteredVehicles().length);
  sellerId = computed(() => {
    const userData = this.authService.getUserData();
    return userData?.appUserId || null;
  });

  ngOnInit(): void {
    this.loadCurrentShift();
    this.loadVehicles();
    this.updateTime(); // Actualizar tiempo solo una vez al iniciar
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupEventListeners(): void {
    // Escuchar cuando se registra un vehículo
    window.addEventListener('vehicleRegistered', () => {
      this.loadVehicles();
    });
    
    // Escuchar cuando se procesa una salida
    window.addEventListener('transactionClosed', () => {
      this.loadVehicles();
    });
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));
  }

  private loadCurrentShift(): void {
    const userData = this.authService.getUserData();
    if (!userData?.appUserId) {
      return;
    }

    this.companyName.set(userData.companyName || '');

    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    this.shiftService.getByUserAndDate(userData.appUserId, today)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe({
        next: (assignments) => {
          // Obtener el primer turno activo (CONFIRMED o PENDING) para hoy
          const activeShift = assignments.find(assignment => {
            const status = assignment.status;
            const statusId = typeof status === 'string' ? status : status?.id;
            return statusId === 'CONFIRMED' || statusId === 'PENDING';
          });

          this.currentShift.set(activeShift || null);
          this.cdr.markForCheck();
        }
      });
  }

  loadVehicles(): void {
    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;
    
    if (!companyId) {
      this.error.set('No se pudo obtener la información de la empresa');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Pasar companyId al servicio para filtrar por empresa
    this.openTransactionService.getAll(companyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err: any) => {
          const errorResponse = err?.error;
          this.error.set(errorResponse?.readableMsg || errorResponse?.message || 'Error al cargar vehículos');
          return of([]);
        })
      )
      .subscribe({
        next: (transactions) => {
          // Filtrar solo los vehículos de la empresa actual y con estado OPEN
          // El backend ya filtra por companyId, pero hacemos un filtro adicional por seguridad
          const companyVehicles = transactions.filter(transaction => {
            const status = transaction.status;
            const statusId = typeof status === 'string' ? status : status?.id;
            const transactionCompanyId = transaction.companyCompanyId;
            
            // Verificar que sea de la empresa y tenga estado OPEN
            return Number(transactionCompanyId) === Number(companyId) && statusId === 'OPEN';
          });
          
          // Ordenar por hora de inicio (más recientes primero)
          companyVehicles.sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
            return timeB - timeA;
          });

          this.vehicles.set(companyVehicles);
          this.applyFilter();
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm().toLowerCase().trim();
    const allVehicles = this.vehicles();

    if (!term) {
      this.filteredVehicles.set(allVehicles);
      return;
    }

    const filtered = allVehicles.filter(vehicle => {
      const plate = vehicle.vehiclePlate?.toLowerCase() || '';
      const vehicleType = this.getVehicleTypeDisplay(vehicle.basicVehicleType || vehicle.tipoVehiculo).toLowerCase();
      return plate.includes(term) || vehicleType.includes(term);
    });

    this.filteredVehicles.set(filtered);
  }

  refresh(): void {
    this.loadVehicles();
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

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
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
      
      // Si tenemos fecha y hora, combinarlas
      if (startDay) {
        // Intentar parsear la fecha
        let datePart: Date;
        try {
          datePart = new Date(startDay);
          if (isNaN(datePart.getTime())) {
            // Si no es una fecha válida, intentar parsear manualmente
            const dateMatch = startDay.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              datePart = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
            } else {
              datePart = new Date();
            }
          }
        } catch {
          datePart = new Date();
        }
        
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
