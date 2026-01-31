import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface CashRegister {
  cashRegisterId?: number;
  shiftConnectionHistoryId?: number;
  shiftConnectionHistory?: any;
  companyCompanyId?: number;
  company?: any;
  appUserId?: number;
  user?: any;
  concept?: EnumResource | string;
  amount?: number;
  initialCash?: number;
  closedTransactionId?: number;
  closedTransaction?: any;
  registerDate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getByShiftConnectionHistory(shiftConnectionHistoryId: number): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(`${this.apiUrl}/cash-registers/by-connection/${shiftConnectionHistoryId}`);
  }

  getTotalByShiftConnectionHistoryAndConcept(shiftConnectionHistoryId: number, concept: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/cash-registers/by-connection/${shiftConnectionHistoryId}/concept/${concept}/total`);
  }

  getTotalByShiftConnectionHistory(shiftConnectionHistoryId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/cash-registers/by-connection/${shiftConnectionHistoryId}/total`);
  }

  setInitialCash(shiftConnectionHistoryId: number, initialCash: number, notes?: string): Observable<CashRegister> {
    let params = new HttpParams()
      .set('shiftConnectionHistoryId', shiftConnectionHistoryId.toString())
      .set('initialCash', initialCash.toString());
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers/set-initial-cash`, null, { params });
  }

  create(cashRegister: CashRegister): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers`, cashRegister);
  }

  registerOtherIncome(shiftConnectionHistoryId: number, amount: number, notes?: string): Observable<CashRegister> {
    let params = new HttpParams()
      .set('shiftConnectionHistoryId', shiftConnectionHistoryId.toString())
      .set('amount', amount.toString());
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers/register-other-income`, null, { params });
  }

  /**
   * Obtiene información de caja por shiftHistoryId validando empresa
   * El backend valida automáticamente que el shiftConnectionHistory pertenezca a la empresa del usuario autenticado
   */
  getCashInfoByShiftHistory(shiftConnectionHistoryId: number, companyId?: number): Observable<{
    registers: CashRegister[];
    total: number;
    initialCash: number;
  }> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    
    return forkJoin({
      registers: this.getByShiftConnectionHistory(shiftConnectionHistoryId),
      total: this.getTotalByShiftConnectionHistory(shiftConnectionHistoryId)
    }).pipe(
      map(({ registers, total }) => {
        // Calcular efectivo inicial (primer registro con initialCash > 0)
        const firstRegister = registers?.find(r => r.initialCash && r.initialCash > 0);
        const initialCash = firstRegister?.initialCash || 0;
        
        return {
          registers: registers || [],
          total: total || 0,
          initialCash
        };
      })
    );
  }
}
