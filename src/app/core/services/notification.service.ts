import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

export interface NotificationOptions {
  severity?: NotificationSeverity;
  summary?: string;
  detail: string;
  life?: number;
  closable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private messageService = inject(MessageService);

  /**
   * Muestra una notificación genérica
   */
  show(options: NotificationOptions): void {
    this.messageService.add({
      severity: options.severity || 'info',
      summary: options.summary || this.getDefaultSummary(options.severity),
      detail: options.detail,
      life: options.life ?? 5000,
      closable: options.closable ?? true
    });
  }

  /**
   * Muestra una notificación de éxito
   */
  success(detail: string, summary?: string): void {
    this.show({
      severity: 'success',
      summary: summary || 'Éxito',
      detail
    });
  }

  /**
   * Muestra una notificación de información
   */
  info(detail: string, summary?: string): void {
    this.show({
      severity: 'info',
      summary: summary || 'Información',
      detail
    });
  }

  /**
   * Muestra una notificación de advertencia
   */
  warn(detail: string, summary?: string): void {
    this.show({
      severity: 'warn',
      summary: summary || 'Advertencia',
      detail
    });
  }

  /**
   * Muestra una notificación de error
   */
  error(detail: string, summary?: string): void {
    this.show({
      severity: 'error',
      summary: summary || 'Error',
      detail,
      life: 7000 // Los errores se muestran más tiempo
    });
  }

  /**
   * Muestra una notificación para errores 412 (PRECONDITION_FAILED)
   */
  showPreconditionFailed(message: string, details?: string): void {
    const fullMessage = details ? `${message}\n${details}` : message;
    this.show({
      severity: 'warn',
      summary: 'Validación fallida',
      detail: fullMessage,
      life: 8000 // Más tiempo para que el usuario lea el mensaje
    });
  }

  /**
   * Limpia todas las notificaciones
   */
  clear(): void {
    this.messageService.clear();
  }

  /**
   * Obtiene el resumen por defecto según la severidad
   */
  private getDefaultSummary(severity?: NotificationSeverity): string {
    switch (severity) {
      case 'success':
        return 'Éxito';
      case 'warn':
        return 'Advertencia';
      case 'error':
        return 'Error';
      default:
        return 'Información';
    }
  }
}
