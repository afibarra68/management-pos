import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface CashRegister {
  cashRegisterId?: number;
  shiftAssignmentId?: number;
  shiftAssignment?: any;
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

  getByShiftAssignment(shiftAssignmentId: number): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(`${this.apiUrl}/cash-registers/by-shift/${shiftAssignmentId}`);
  }

  getTotalByShiftAssignmentAndConcept(shiftAssignmentId: number, concept: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/cash-registers/by-shift/${shiftAssignmentId}/concept/${concept}/total`);
  }

  getTotalByShiftAssignment(shiftAssignmentId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/cash-registers/by-shift/${shiftAssignmentId}/total`);
  }

  setInitialCash(shiftAssignmentId: number, initialCash: number, notes?: string): Observable<CashRegister> {
    let params = new HttpParams()
      .set('shiftAssignmentId', shiftAssignmentId.toString())
      .set('initialCash', initialCash.toString());
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers/set-initial-cash`, null, { params });
  }

  create(cashRegister: CashRegister): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers`, cashRegister);
  }

  registerOtherIncome(shiftAssignmentId: number, amount: number, notes?: string): Observable<CashRegister> {
    let params = new HttpParams()
      .set('shiftAssignmentId', shiftAssignmentId.toString())
      .set('amount', amount.toString());
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<CashRegister>(`${this.apiUrl}/cash-registers/register-other-income`, null, { params });
  }
}
