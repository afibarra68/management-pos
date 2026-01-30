import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface VehicleCapacity {
  vehicleCapacityId?: number;
  companyCompanyId?: number;
  company?: any;
  tipoVehiculo?: EnumResource;
  capacity?: number;
  isActive?: boolean;
  available?: number;
}

export interface ParkingOccupancy {
  tipoVehiculo: EnumResource;
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleCapacityService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getActiveByCompany(companyId: number): Observable<VehicleCapacity[]> {
    return this.http.get<VehicleCapacity[]>(`${this.apiUrl}/vehicle-capacities/by-company/${companyId}/active`);
  }

  /**
   * Obtiene el estado de ocupación del parqueadero
   */
  getParkingOccupancy(companyId: number, openTransactions: any[]): Observable<ParkingOccupancy[]> {
    return new Observable(observer => {
      this.getActiveByCompany(companyId).subscribe({
        next: (capacities) => {
          const occupancy: ParkingOccupancy[] = capacities.map(capacity => {
            const tipoVehiculoId = typeof capacity.tipoVehiculo === 'string' 
              ? capacity.tipoVehiculo 
              : capacity.tipoVehiculo?.id;

            // Contar vehículos ocupados de este tipo
            const occupied = openTransactions.filter(transaction => {
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
              tipoVehiculo: capacity.tipoVehiculo!,
              capacity: capacity.capacity || 0,
              occupied,
              available,
              occupancyPercentage
            };
          });

          observer.next(occupancy);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
