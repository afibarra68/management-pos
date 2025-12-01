import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OpenTransaction {
  openTransactionId?: number;
  startTime?: string;
  startDay?: string;
  endDate?: string | null;
  endTime?: string | null;
  currency?: number;
  companyCompanyId?: number;
  status?: string;
  billingPriceBillingPriceId?: number | null;
  amount?: number;
  discount?: string | null;
  totalAmount?: number;
  timeElapsed?: string | null;
  operationDate?: string;
  serviceTypeServiceTypeId?: number | null;
  appUserAppUserSeller?: number | null;
  vehiclePlate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenTransactionService {
  private apiUrl = `${environment.apiUrl}/open-transactions`;

  constructor(private http: HttpClient) {}

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
}

