import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface BuildTicket {
  template?: string;
  printerName?: string | null;
  printerType?: string | null;
  conectionString?: string | null;
}

export interface OpenTransaction {
  openTransactionId?: number;
  startTime?: string;
  startDay?: string;
  endDate?: string | null;
  endTime?: string | null;
  currency?: number;
  companyCompanyId?: number;
  status?: string | EnumResource;
  billingPriceBillingPriceId?: number | null;
  amount?: number;
  discount?: string | null;
  totalAmount?: number;
  timeElapsed?: string | null;
  operationDate?: string;
  serviceTypeServiceTypeId?: number | null;
  appUserAppUserSeller?: number | null;
  vehiclePlate?: string;
  tipoVehiculo?: EnumResource | string;
  basicVehicleType?: EnumResource | string;
  codeService?: string;
  buildTicket?: BuildTicket;
}

export interface ParamVenta {
  serviceCode: string;
  collaboratorId: number;
  collaboratorDescription: string;
  companyBusinessServiceId?: number;
  easyMode: boolean;
  vehicleType: EnumResource[];
  basicVehicleType: EnumResource[];
}

@Injectable({
  providedIn: 'root'
})
export class OpenTransactionService {
  private apiUrl = `${environment.apiUrl}/open-transactions`;

  constructor(private http: HttpClient) { }

  create(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.post<OpenTransaction>(this.apiUrl, transaction);
  }

  update(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.put<OpenTransaction>(this.apiUrl, transaction);
  }

  getById(id: number): Observable<OpenTransaction> {
    return this.http.get<OpenTransaction>(`${this.apiUrl}/${id}`);
  }

  getAll(): Observable<OpenTransaction[]> {
    return this.http.get<OpenTransaction[]>(this.apiUrl);
  }

  findByVehiclePlate(vehiclePlate: string): Observable<OpenTransaction> {
    return this.http.get<OpenTransaction>(`${this.apiUrl}/by-plate`, {
      params: { vehiclePlate }
    });
  }

  getParams(serviceCode: string): Observable<ParamVenta> {
    return this.http.get<ParamVenta>(`${this.apiUrl}/params/${serviceCode}`);
  }
}

