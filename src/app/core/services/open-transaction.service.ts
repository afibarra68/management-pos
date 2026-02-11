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

export interface DShiftType {
  shiftTypeId?: number;
  typeName?: string;
  durationHours?: number;
  companyCompanyId?: number;
  isActive?: boolean;
}

export interface DShift {
  shiftId?: number;
  shiftTypeId?: number;
  shiftType?: DShiftType;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string | EnumResource;
  companyCompanyId?: number;
  hoursToConciliate?: number;
}

/** Respuesta del endpoint orden de llegada Cartón América (solo tipos CAMION_C_AMERICA, DBLTR_C_AMER, TRACQ_C_AMER). */
export interface CartonAmericaOrdenLlegada {
  ordenDeLlegada: number;
  openTransactionId?: number;
  vehiclePlate?: string;
  tipoVehiculoLabel?: string;
  startDay?: string;
  startTime?: string;
  operationDate?: string;
  notes?: string;
}

export interface ParamVenta {
  serviceCode: string;
  collaboratorId: number;
  collaboratorDescription: string;
  companyBusinessServiceId?: number;
  easyMode: boolean;
  vehicleType?: EnumResource[] | null;
  basicVehicleType?: EnumResource[] | null;
  hasActiveShift?: boolean;
  canManageCashExit?: boolean;
  dshiftConnectionHistory?: ShiftConnectionHistory;
  /** Si true, debe ir al POS a terminar turno antes de poder cerrar sesión (validado por backend). */
  mustFinishShiftBeforeLogout?: boolean;
  /** Validación backend: true si se puede cerrar el turno por horario (hora actual >= fin del turno). */
  canCloseShiftNow?: boolean;
}

export interface ShiftConnectionHistory {
  shiftConnectionHistoryId?: number;
  appUserId?: number;
  user?: {
    appUserId?: number;
    firstName?: string;
    secondName?: string;
    lastName?: string;
    secondLastName?: string | null;
    numberIdentity?: string;
    sha?: string | null;
    password?: string | null;
    phoneNumber?: string | null;
    salt?: string | null;
    accessCredential?: string | null;
    loginLimit?: string;
    companyCompanyId?: number;
    processorId?: string;
  };
  companyCompanyId?: number;
  connectionTime?: string;
  userAgent?: string | null;
  status?: 'ACTIVO' | 'CERRADO' | EnumResource;
  actualShiftDate?: string;
  shiftId?: number;
  shift?: DShift;
  shiftAssignmentId?: number;
  totalVehicleExits?: number;
  totalSubscriptionExits?: number;
  totalPaidExits?: number;
  totalCashReceived?: number;
  totalOtherPayments?: number;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closedBy?: {
    appUserId?: number;
    firstName?: string;
    lastName?: string;
  } | null;
  hoursToCloseOnHistory?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class OpenTransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/open-transactions`;
  /** API modelo POS (orden de llegada Cartón América, fecha ingreso) */
  private posApiUrl = `${environment.apiUrl}/pos`;

  create(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.post<OpenTransaction>(this.apiUrl, transaction);
  }

  update(transaction: OpenTransaction): Observable<OpenTransaction> {
    return this.http.put<OpenTransaction>(this.apiUrl, transaction);
  }

  /**
   * Actualiza solo fecha y hora de ingreso por UPDATE nativo (modelo POS).
   * PUT /pos/fecha-ingreso — body: { openTransactionId, operationDate }.
   */
  updateFechaHoraIngreso(payload: {
    openTransactionId: number;
    operationDate: string;
  }): Observable<OpenTransaction> {
    return this.http.put<OpenTransaction>(`${this.posApiUrl}/fecha-ingreso`, payload);
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

  /**
   * Obtiene una página de transacciones abiertas (para paginación lazy como en t-parking).
   * Respeta totalElements y totalPages del backend.
   */
  getPage(params: {
    companyId: number;
    page: number;
    size: number;
    vehiclePlate?: string;
  }): Observable<PageResponse<OpenTransaction>> {
    let httpParams = new HttpParams()
      .set('status', 'OPEN')
      .set('page', params.page.toString())
      .set('size', params.size.toString());
    // Backend usa companyCompanyId
    httpParams = httpParams.set('companyCompanyId', params.companyId.toString());
    if (params.vehiclePlate != null && params.vehiclePlate.trim() !== '') {
      httpParams = httpParams.set('vehiclePlate', params.vehiclePlate.trim().toUpperCase());
    }

    return this.http.get<PageResponse<OpenTransaction>>(this.apiUrl, { params: httpParams }).pipe(
      map(response => {
        const content = response.content || [];
        const filtered = content.filter(transaction => {
          const status = transaction.status;
          const statusId = typeof status === 'string' ? status : status?.id;
          return statusId === 'OPEN';
        });
        return {
          ...response,
          content: filtered,
          numberOfElements: filtered.length
          // totalElements y totalPages se mantienen del backend
        };
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

  /**
   * Obtiene DDataPrinting para reimprimir la tirilla de ingreso de un vehículo en parqueadero.
   * Consulta por openTransactionId, el backend mapea desde OpenTransaction, pasa por buildTicket
   * y retorna la data lista para enviar al servicio de impresión.
   */
  getReprintTicketData(openTransactionId: number): Observable<BuildTicket> {
    return this.http.get<BuildTicket>(`${this.apiUrl}/${openTransactionId}/reprint-ticket`);
  }

  /**
   * Lista vehículos Cartón América con orden de llegada (modelo POS).
   * GET /pos/carton-america/orden-llegada
   */
  getCartonAmericaOrdenLlegada(): Observable<CartonAmericaOrdenLlegada[]> {
    return this.http.get<CartonAmericaOrdenLlegada[]>(`${this.posApiUrl}/carton-america/orden-llegada`);
  }
}

