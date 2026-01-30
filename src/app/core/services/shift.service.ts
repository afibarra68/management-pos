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
  shiftId?: number; // Identificador del turno (Shift)
  shiftAssignmentId?: number; // Identificador de la asignación de turno (ShiftAssignment)
  totalVehicleExits?: number;
  totalSubscriptionExits?: number;
  totalPaidExits?: number;
  totalCashReceived?: number;
  totalOtherPayments?: number;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closedBy?: { appUserId?: number; firstName?: string; secondName?: string; lastName?: string } | null;
  hoursToCloseOnHistory?: number | null;
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
   * Cierra un turno manualmente
   */
  closeShiftHistory(shiftHistoryId: number): Observable<ShiftConnectionHistory> {
    return this.http.post<ShiftConnectionHistory>(`${environment.apiUrl}/shift-validation/close/${shiftHistoryId}`, {});
  }
}
