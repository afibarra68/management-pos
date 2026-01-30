import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BuildTicket } from './open-transaction.service';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private http = inject(HttpClient);
  // URL del servicio de impresión parking-printing V2 (con byte[] base64)
  private printApiUrl = 'http://127.0.0.1:8080/v2/bi/print';

  /**
   * Envía el ticket a imprimir al servicio parking-printing
   * Convierte el template a base64 usando btoa antes de enviar
   * @param buildTicket Objeto con el template y datos de la impresora
   */
  printTicket(buildTicket: BuildTicket): Observable<any> {
    // Convertir template string a base64 usando btoa
    const requestPayload = {
      ...buildTicket,
      template: buildTicket.template ? this.stringToBase64(buildTicket.template) : null
    };
    
    return this.http.post<any>(this.printApiUrl, requestPayload);
  }

  /**
   * Convierte un string a base64 usando btoa (nativo del navegador)
   * @param str String a convertir
   * @returns String en base64
   */
  private stringToBase64(str: string): string {
    try {
      // btoa funciona con caracteres ASCII, para UTF-8 necesitamos codificar primero
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      // Fallback: usar TextEncoder si está disponible
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return btoa(String.fromCharCode(...bytes));
      }
      // Último recurso: btoa directo (puede fallar con caracteres especiales)
      return btoa(str);
    }
  }
}

