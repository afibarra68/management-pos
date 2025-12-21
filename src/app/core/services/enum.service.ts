import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EnumResource {
  id: string;
  description: string;
  descriptionExtended?: string;
}

export interface EnumsResponse {
  status: EnumResource[];
  tipoVehiculo: EnumResource[];
}

@Injectable({
  providedIn: 'root'
})
export class EnumService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  /**
   * Obtiene los enums para tarifas (EBillingStatus y ETipoVehiculo)
   */
  getBillingPriceEnums(): Observable<EnumsResponse> {
    return this.http.get<EnumsResponse>(`${this.apiUrl}/billing-prices/enums`);
  }

  /**
   * Obtiene cualquier enum por su nombre
   * @param enumName Nombre del enum (ej: 'ETipoVehiculo', 'EBillingStatus')
   */
  getEnumByName(enumName: string): Observable<EnumResource[]> {
    return this.http.get<EnumResource[]>(`${this.apiUrl}/enums/${enumName}`);
  }
}

