import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { ClosedTransactionService } from '../../../core/services/closed-transaction.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-registrar-salida',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    DialogModule,
    SharedModule,
    ToastModule
  ],
  templateUrl: './registrar-salida.component.html',
  styleUrls: ['./registrar-salida.component.scss']
})
export class RegistrarSalidaComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  buscando = false;
  showModal = false;
  vehiculoEncontrado: OpenTransaction | null = null;
  tiempoTranscurrido: string = '';
  private intervalId: any;

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    private closedTransactionService: ClosedTransactionService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    // Cargar vehículo si viene de algún lugar
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  buscarVehiculo(): void {
    if (this.form.get('vehiclePlate')?.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    this.buscando = true;
    this.error = null;

    const placa = this.form.value.vehiclePlate.toUpperCase().trim();
    
    this.openTransactionService.findByVehiclePlate(placa).subscribe({
      next: (transaction) => {
        console.log('Vehículo encontrado:', transaction);
        this.buscando = false;
        this.vehiculoEncontrado = transaction;
        this.calcularTiempoTranscurrido();
        // Forzar detección de cambios antes de mostrar el modal
        this.cdr.detectChanges();
        // Usar setTimeout para asegurar que el modal se muestre después de la detección de cambios
        setTimeout(() => {
          this.showModal = true;
          this.cdr.detectChanges();
        }, 0);
        // Actualizar tiempo cada minuto
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
          this.calcularTiempoTranscurrido();
        }, 60000); // Cada minuto
      },
      error: (err) => {
        console.error('Error al buscar vehículo:', err);
        this.buscando = false;
        this.error = err?.error?.message || 'No se encontró un vehículo con esa placa en estado abierto';
        this.cdr.detectChanges();
      }
    });
  }

  calcularTiempoTranscurrido(): void {
    if (!this.vehiculoEncontrado?.startDay || !this.vehiculoEncontrado?.startTime) {
      this.tiempoTranscurrido = 'No disponible';
      return;
    }

    const startDate = new Date(`${this.vehiculoEncontrado.startDay}T${this.vehiculoEncontrado.startTime}`);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    this.tiempoTranscurrido = `${hours}h ${minutes}m`;
  }

  procesarSalida(): void {
    if (!this.vehiculoEncontrado || !this.vehiculoEncontrado.openTransactionId) {
      this.error = 'Información de transacción inválida';
      return;
    }

    this.loading = true;
    this.error = null;

    this.closedTransactionService.closeTransaction(this.vehiculoEncontrado.openTransactionId).subscribe({
      next: (closedTransaction) => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Salida registrada exitosamente. Total a pagar: $${closedTransaction.totalAmount || 0}`,
          life: 5000
        });
        this.cerrarModal();
        this.form.reset();
        // Emitir evento para actualizar el dashboard
        window.dispatchEvent(new CustomEvent('transactionClosed'));
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al procesar la salida del vehículo';
      }
    });
  }

  cancelar(): void {
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.showModal = false;
    this.vehiculoEncontrado = null;
    this.tiempoTranscurrido = '';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }


}

