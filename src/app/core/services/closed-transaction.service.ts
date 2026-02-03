import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BuildTicket, ParamVenta } from './open-transaction.service';

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
  buildTicket?: BuildTicket;
}

@Injectable({
  providedIn: 'root'
})
export class ClosedTransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiAuthJwt}/closed-transactions`;

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

  closeTransactionWithModel(finalizeTransaction: FinalizeTransaction): Observable<ClosedTransaction> {
    return this.http.post<ClosedTransaction>(`${this.apiUrl}/close`, finalizeTransaction);
  }

  getTodayStats(): Observable<ClosedTransactionStats> {
    return this.http.get<ClosedTransactionStats>(`${this.apiUrl}/today-stats`);
  }

  /**
   * Obtiene los parámetros de configuración para un servicio específico
   * Incluye información completa del turno activo (ShiftConnectionHistory con Shift y ShiftType)
   */
  getParams(serviceCode: string): Observable<ParamVenta> {
    return this.http.get<ParamVenta>(`${this.apiUrl}/params/${serviceCode}`);
  }

  /**
   * Obtiene DDataPrinting para reimprimir la tirilla de salida de una transacción cerrada.
   * El backend consulta por closedTransactionId, mapea desde ClosedTransaction/OpenTransaction,
   * pasa por buildTicket (OUT) y retorna la data para enviar al servicio de impresión.
   * @param closedTransactionId ID de la transacción cerrada
   * @returns BuildTicket (DDataPrinting) listo para enviar a PrintService
   */
  getReprintTicketData(closedTransactionId: number): Observable<BuildTicket> {
    return this.http.get<BuildTicket>(`${this.apiUrl}/${closedTransactionId}/reprint-ticket`);
  }
}

export interface ClosedTransactionStats {
  totalTransactions: number;
  totalAmount: number;
  currency: string;
  transactions: ClosedTransactionSummary[];
}

export interface ClosedTransactionSummary {
  closedTransactionId: number;
  operationDate: string;
  timeElapsed: string;
  totalAmount: number;
  currency: string;
  sellerName: string;
}

export interface FinalizeTransaction {
  receiptModel: string; // "LIQUID"
  vehiclePlate: string;
  codeService: string;
  notes?: string;
}