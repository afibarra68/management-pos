import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EnumResource } from './enum.service';

export interface DShiftType {
  shiftTypeId?: number;
  typeName?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  shiftCode?: string;
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
}
