import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClosedTransaction {
  closedTransactionId?: number;
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
  sellerAppUserId?: number | null;
  sellerName?: string | null;
  contractor?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClosedTransactionService {
  private apiUrl = `${environment.apiUrl}/closed-transactions`;

  constructor(private http: HttpClient) {}

  create(transaction: ClosedTransaction): Observable<ClosedTransaction> {
    return this.http.post<ClosedTransaction>(this.apiUrl, transaction);
  }

  update(transaction: ClosedTransaction): Observable<ClosedTransaction> {
    return this.http.put<ClosedTransaction>(this.apiUrl, transaction);
  }

  getById(id: number): Observable<ClosedTransaction> {
    return this.http.get<ClosedTransaction>(`${this.apiUrl}/${id}`);
  }

  getAll(): Observable<ClosedTransaction[]> {
    return this.http.get<ClosedTransaction[]>(this.apiUrl);
  }

  closeTransaction(openTransactionId: number): Observable<ClosedTransaction> {
    return this.http.post<ClosedTransaction>(`${this.apiUrl}/close/${openTransactionId}`, {});
  }
}

