import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { UtilsService } from '../services/utils.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-registrar-placa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    CardModule,
    ConfirmDialogModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './registrar-placa.component.html',
  styleUrls: ['./registrar-placa.component.scss']
})
export class RegistrarPlacaComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    public router: Router,
    private utilsService: UtilsService
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    const vehiclePlate = this.form.value.vehiclePlate.toUpperCase().trim();

    // Mostrar diálogo de confirmación
    this.utilsService.confirmVehicleEntry(vehiclePlate).subscribe({
      next: (confirmed) => {
        if (confirmed) {
          this.processRegistration(vehiclePlate);
        }
      }
    });
  }

  private processRegistration(vehiclePlate: string): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    // Solo enviamos la placa, el backend agrega el resto de la información
    const transactionData: OpenTransaction = {
      vehiclePlate: vehiclePlate
    };

    this.openTransactionService.create(transactionData).subscribe({
      next: (response) => {
        this.loading = false;
        this.utilsService.showSuccess(
          `Placa ${response.vehiclePlate} registrada exitosamente`,
          'Ingreso Confirmado'
        );
        this.form.reset();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al registrar la placa';
        this.utilsService.showError(
          err?.error?.message || 'Error al registrar la placa',
          'Error en el Registro'
        );
      }
    });
  }
}
