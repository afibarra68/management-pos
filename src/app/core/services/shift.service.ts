import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

/** Respuesta de /shift-validation/active-shift y /shift-validation/close/{id} */
export interface ShiftConnectionHistory {
  shiftConnectionHistoryId?: number;
  appUserId?: number;
  user?: {
    appUserId?: number;
    firstName?: string;
    secondName?: string;
    lastName?: string;
  };
  shiftAssignmentId?: number;
  shiftAssignment?: {
    shiftAssignmentId?: number;
    shiftId?: number;
    shift?: DShift;
    appUserId?: number;
    [key: string]: unknown;
  };
  companyCompanyId?: number;
  connectionTime?: string;
  userAgent?: string | null;
  status?: 'ACTIVO' | 'CERRADO' | EnumResource;
  actualShiftDate?: string;
  totalVehicleExits?: number;
  totalSubscriptionExits?: number;
  totalPaidExits?: number;
  totalCashReceived?: number;
  totalOtherPayments?: number;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closedBy?: { appUserId?: number; firstName?: string; secondName?: string; lastName?: string };
}

export interface DShiftType {
  shiftTypeId?: number;
  typeName?: string;
  description?: string;
  durationHours?: number;
  companyCompanyId?: number;
  isActive?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface DShift {
  shiftId?: number;
  shiftTypeId?: number;
  shiftType?: DShiftType;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string | EnumResource;
  notes?: string;
  month?: number;
  year?: number;
}

export interface DShiftAssignment {
  shiftAssignmentId?: number;
  shiftId?: number;
  shift?: DShift;
  appUserId?: number;
  status?: string | EnumResource;
  assignedAt?: string;
  confirmedAt?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/shift-assignments`;

  /**
   * Obtiene las asignaciones de turnos de un usuario para una fecha específica
   */
  getByUserAndDate(userId: number, shiftDate: string): Observable<DShiftAssignment[]> {
    return this.http.get<DShiftAssignment[]>(`${this.apiUrl}/by-user-date`, {
      params: {
        userId: userId.toString(),
        shiftDate: shiftDate
      }
    });
  }

  /**
   * Obtiene todas las asignaciones de turnos de un usuario
   */
  getByUser(userId: number): Observable<DShiftAssignment[]> {
    return this.http.get<DShiftAssignment[]>(`${this.apiUrl}/by-user/${userId}`);
  }

  /**
   * Cierra un turno cambiando su estado a COMPLETED
   */
  closeShift(shiftAssignmentId: number): Observable<DShiftAssignment> {
    return this.http.post<DShiftAssignment>(`${this.apiUrl}/${shiftAssignmentId}/close`, {});
  }

  /**
   * Verifica si el usuario tiene un turno activo
   */
  hasActiveShift(): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/shift-validation/has-active-shift`);
  }

  /**
   * Obtiene o crea el turno activo del usuario (ShiftConnectionHistory ACTIVO)
   */
  getOrCreateActiveShift(): Observable<ShiftConnectionHistory> {
    return this.http.get<ShiftConnectionHistory>(`${environment.apiUrl}/shift-validation/active-shift`);
  }

  /**
   * Valida si se puede cerrar un turno (10 minutos antes de finalizar)
   */
  canCloseShift(shiftHistoryId: number): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/shift-validation/can-close/${shiftHistoryId}`);
  }

  /**
   * Cierra un turno manualmente
   */
  closeShiftHistory(shiftHistoryId: number): Observable<ShiftConnectionHistory> {
    return this.http.post<ShiftConnectionHistory>(`${environment.apiUrl}/shift-validation/close/${shiftHistoryId}`, {});
  }
}
