import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BuildTicket, ParamVenta } from './open-transaction.service';

/** Prefijo de la clave en sessionStorage para params (params por serviceCode). Se limpia al cerrar sesión. */
export const PARAMS_SESSION_KEY_PREFIX = 'mt_params_';

export function getParamsSessionKey(serviceCode: string): string {
  return `${PARAMS_SESSION_KEY_PREFIX}${serviceCode}`;
}

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
   * Obtiene los parámetros de configuración para un servicio específico.
   * Incluye información completa del turno activo (ShiftConnectionHistory con Shift y ShiftType).
   * Usa sessionStorage para no consultar el API en cada llamada (se invalida al cerrar sesión).
   */
  getParams(serviceCode: string): Observable<ParamVenta> {
    const key = getParamsSessionKey(serviceCode);
    if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ParamVenta;
          return of(parsed);
        } catch {
          sessionStorage.removeItem(key);
        }
      }
    }
    return this.http.get<ParamVenta>(`${this.apiUrl}/params/${serviceCode}`).pipe(
      tap(data => {
        if (typeof sessionStorage !== 'undefined' && data) {
          try {
            sessionStorage.setItem(key, JSON.stringify(data));
          } catch {
            // ignore quota or serialization errors
          }
        }
      })
    );
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
  /** ID del turno activo para registrar el pago en caja. Se envía cuando el usuario tiene turno (params.dshiftConnectionHistory). */
  shiftConnectionHistoryId?: number;
}