import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

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
  notes?: string;
  codeService?: string;
  buildTicket?: BuildTicket;
  bySubscription?: boolean;
  paymentType?: string | EnumResource;
}

export interface ParamVenta {
  serviceCode: string;
  collaboratorId: number;
  collaboratorDescription: string;
  companyBusinessServiceId?: number;
  easyMode: boolean;
  vehicleType: EnumResource[];
  basicVehicleType: EnumResource[];
  hasActiveShift?: boolean;
  canManageCashExit?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OpenTransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/open-transactions`;

  create(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.post<OpenTransaction>(this.apiUrl, transaction);
  }

  update(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.put<OpenTransaction>(this.apiUrl, transaction);
  }

  getById(id: number): Observable<OpenTransaction> {
    return this.http.get<OpenTransaction>(`${this.apiUrl}/${id}`);
  }

  getAll(companyId?: number): Observable<OpenTransaction[]> {
    let params = new HttpParams().set('status', 'OPEN');
    
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    
    return this.http.get<PageResponse<OpenTransaction>>(this.apiUrl, { params }).pipe(
      map(response => {
        // Filtrar también en el frontend por si acaso
        const content = response.content || [];
        return content.filter(transaction => {
          const status = transaction.status;
          const statusId = typeof status === 'string' ? status : status?.id;
          return statusId === 'OPEN';
        });
      })
    );
  }

  getAllPageable(page: number = 0, size: number = 1000): Observable<PageResponse<OpenTransaction>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('status', 'OPEN');
    
    return this.http.get<PageResponse<OpenTransaction>>(this.apiUrl, { params }).pipe(
      map(response => {
        // Filtrar también en el frontend por si acaso
        const content = response.content || [];
        const filteredContent = content.filter(transaction => {
          const status = transaction.status;
          const statusId = typeof status === 'string' ? status : status?.id;
          return statusId === 'OPEN';
        });
        
        return {
          ...response,
          content: filteredContent,
          numberOfElements: filteredContent.length,
          totalElements: filteredContent.length
        };
      })
    );
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

