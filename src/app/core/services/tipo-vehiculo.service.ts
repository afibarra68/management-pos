import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoVehiculo {
  id: string;
  description: string;
  descriptionExtended?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipoVehiculoService {
  private apiUrl = `${environment.apiUrl}/tipos-vehiculo`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoVehiculo[]> {
    return this.http.get<TipoVehiculo[]>(this.apiUrl);
  }
}

