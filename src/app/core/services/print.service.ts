import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BuildTicket } from './open-transaction.service';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  // URL directa del servicio de impresión parking-printing
  private printApiUrl = 'http://127.0.0.1:8080/print';

  constructor(private http: HttpClient) { }

  /**
   * Envía el ticket a imprimir al servicio parking-printing
   * @param buildTicket Objeto con el template y datos de la impresora
   */
  printTicket(buildTicket: BuildTicket): Observable<any> {
    return this.http.post<any>(this.printApiUrl, buildTicket);
  }
}

