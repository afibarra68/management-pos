import { Injectable } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface ConfirmDialogOptions {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptButtonStyleClass?: string;
  rejectButtonStyleClass?: string;
}

export interface CustomDialogOptions {
  component: any;
  data?: any;
  header?: string;
  width?: string;
  height?: string;
  modal?: boolean;
  closable?: boolean;
  dismissableMask?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(
    private dialogService: DialogService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  /**
   * Muestra un diálogo de confirmación
   * @param options Opciones del diálogo de confirmación
   * @returns Observable<boolean> - true si se acepta, false si se rechaza
   */
  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    return new Observable(observer => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header || 'Confirmar',
        icon: options.icon || 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel || 'Sí',
        rejectLabel: options.rejectLabel || 'No',
        acceptButtonStyleClass: options.acceptButtonStyleClass || 'p-button-primary',
        rejectButtonStyleClass: options.rejectButtonStyleClass || 'p-button-secondary',
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Abre un diálogo personalizado con un componente
   * @param options Opciones del diálogo personalizado
   * @returns DynamicDialogRef | null - Referencia al diálogo abierto
   */
  openDialog(options: CustomDialogOptions): DynamicDialogRef | null {
    return this.dialogService.open(options.component, {
      header: options.header || 'Información',
      width: options.width || '50vw',
      height: options.height,
      modal: options.modal !== false,
      closable: options.closable !== false,
      dismissableMask: options.dismissableMask || false,
      data: options.data || {}
    });
  }

  /**
   * Muestra un mensaje de éxito
   */
  showSuccess(message: string, summary: string = 'Éxito'): void {
    this.messageService.add({
      severity: 'success',
      summary: summary,
      detail: message,
      life: 3000
    });
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message: string, summary: string = 'Error'): void {
    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: message,
      life: 5000
    });
  }

  /**
   * Muestra un mensaje de información
   */
  showInfo(message: string, summary: string = 'Información'): void {
    this.messageService.add({
      severity: 'info',
      summary: summary,
      detail: message,
      life: 3000
    });
  }

  /**
   * Muestra un mensaje de advertencia
   */
  showWarning(message: string, summary: string = 'Advertencia'): void {
    this.messageService.add({
      severity: 'warn',
      summary: summary,
      detail: message,
      life: 4000
    });
  }

  /**
   * Confirma el ingreso de un vehículo
   * @param vehiclePlate Placa del vehículo
   * @returns Observable<boolean>
   */
  confirmVehicleEntry(vehiclePlate: string): Observable<boolean> {
    return this.confirm({
      message: `¿Confirma el ingreso del vehículo con placa ${vehiclePlate}?`,
      header: 'Confirmar Ingreso de Vehículo',
      icon: 'pi pi-car',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success'
    });
  }

  /**
   * Confirma la salida de un vehículo
   * @param vehiclePlate Placa del vehículo
   * @returns Observable<boolean>
   */
  confirmVehicleExit(vehiclePlate: string): Observable<boolean> {
    return this.confirm({
      message: `¿Confirma la salida del vehículo con placa ${vehiclePlate}?`,
      header: 'Confirmar Salida de Vehículo',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success'
    });
  }
}

