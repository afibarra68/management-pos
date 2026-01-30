import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { VehicleCapacityService, ParkingOccupancy } from '../../../core/services/vehicle-capacity.service';
import { OpenTransactionService, OpenTransaction } from '../../../core/services/open-transaction.service';
import { AuthService } from '../../../core/services/auth.service';
import { EnumResource } from '../../../core/services/enum.service';
import { Subject, forkJoin, takeUntil, finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-parking-map',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ProgressBarModule,
    MessageModule
  ],
  templateUrl: './parking-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParkingMapComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private vehicleCapacityService = inject(VehicleCapacityService);
  private openTransactionService = inject(OpenTransactionService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  error = signal<string | null>(null);
  occupancyData = signal<ParkingOccupancy[]>([]);
  totalCapacity = signal(0);
  totalOccupied = signal(0);
  totalAvailable = signal(0);
  overallOccupancyPercentage = signal(0);

  // Computed signal para verificar si hay datos (público para acceso desde el padre)
  hasData = computed(() => this.occupancyData().length > 0);

  /**
   * Obtiene el color según el porcentaje de ocupación
   */
  getOccupancyColor(percentage: number): string {
    if (percentage >= 90) return 'var(--red-500)';
    if (percentage >= 70) return 'var(--orange-500)';
    if (percentage >= 50) return 'var(--yellow-500)';
    return 'var(--green-500)';
  }

  ngOnInit(): void {
    this.loadParkingMap();

    // Escuchar eventos de actualización
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escuchar cuando se registra un vehículo
    window.addEventListener('vehicleRegistered', () => {
      this.loadParkingMap();
    });

    // Escuchar cuando se procesa una salida
    window.addEventListener('transactionClosed', () => {
      this.loadParkingMap();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadParkingMap(): void {
    const userData = this.authService.getUserData();
    if (!userData?.companyId) {
      this.error.set('No se pudo obtener la información de la empresa');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Obtener transacciones abiertas y capacidades en paralelo
    forkJoin({
      openTransactions: this.openTransactionService.getAll().pipe(
        catchError(() => of([] as OpenTransaction[]))
      ),
      capacities: this.vehicleCapacityService.getActiveByCompany(userData.companyId).pipe(
        catchError(() => of([]))
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ openTransactions, capacities }) => {
          const occupancy: ParkingOccupancy[] = capacities.map((capacity: any) => {
            const tipoVehiculoId = typeof capacity.tipoVehiculo === 'string'
              ? capacity.tipoVehiculo
              : capacity.tipoVehiculo?.id;

            // Contar vehículos ocupados de este tipo
            const occupied = openTransactions.filter((transaction: OpenTransaction) => {
              const transactionType = transaction.tipoVehiculo;
              const transactionTypeId = typeof transactionType === 'string'
                ? transactionType
                : transactionType?.id;
              return transactionTypeId === tipoVehiculoId;
            }).length;

            const available = (capacity.capacity || 0) - occupied;
            const occupancyPercentage = capacity.capacity && capacity.capacity > 0
              ? Math.round((occupied / capacity.capacity) * 100)
              : 0;

            return {
              tipoVehiculo: capacity.tipoVehiculo,
              capacity: capacity.capacity || 0,
              occupied,
              available,
              occupancyPercentage
            };
          });

          this.occupancyData.set(occupancy);

          // Calcular totales
          const totalCap = occupancy.reduce((sum, item) => sum + item.capacity, 0);
          const totalOcc = occupancy.reduce((sum, item) => sum + item.occupied, 0);
          const totalAvail = totalCap - totalOcc;
          const overallPercentage = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

          this.totalCapacity.set(totalCap);
          this.totalOccupied.set(totalOcc);
          this.totalAvailable.set(totalAvail);
          this.overallOccupancyPercentage.set(overallPercentage);
        },
        error: (err: any) => {
          const errorResponse = err?.error;
          this.error.set(errorResponse?.readableMsg || errorResponse?.message || 'Error al cargar el mapa de puestos');
        }
      });
  }

  getVehicleTypeDisplay(enumResource: EnumResource | string | null | undefined): string {
    if (!enumResource) return 'Desconocido';
    if (typeof enumResource === 'string') return enumResource;
    return enumResource.description || enumResource.id || 'Desconocido';
  }

  getOccupancyStatus(percentage: number): string {
    if (percentage >= 90) return 'Crítico';
    if (percentage >= 70) return 'Alto';
    if (percentage >= 50) return 'Moderado';
    return 'Disponible';
  }
}
