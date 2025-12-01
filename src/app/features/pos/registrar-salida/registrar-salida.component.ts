import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { Router } from '@angular/router';

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
    CardModule,
    SharedModule
  ],
  templateUrl: './registrar-salida.component.html',
  styleUrls: ['./registrar-salida.component.scss']
})
export class RegistrarSalidaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  vehiculoEncontrado: OpenTransaction | null = null;
  buscando = false;

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    private router: Router
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    // Cargar vehículo si viene de algún lugar
  }

  buscarVehiculo(): void {
    if (this.form.get('vehiclePlate')?.invalid) {
      this.error = 'Por favor ingrese la placa del vehículo';
      return;
    }

    this.buscando = true;
    this.error = null;
    this.vehiculoEncontrado = null;

    const placa = this.form.value.vehiclePlate.toUpperCase().trim();
    
    // Por ahora simulamos la búsqueda, luego se implementará el endpoint
    // TODO: Implementar búsqueda de vehículo por placa
    this.buscando = false;
    this.error = 'Funcionalidad en desarrollo. Próximamente se podrá buscar y procesar la salida.';
  }

  procesarSalida(): void {
    if (!this.vehiculoEncontrado) {
      this.error = 'Debe buscar un vehículo primero';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    // TODO: Implementar lógica para procesar la salida
    // Esto actualizará la transacción con fecha/hora de salida y calculará el total
    setTimeout(() => {
      this.loading = false;
      this.success = 'Salida registrada exitosamente';
      this.vehiculoEncontrado = null;
      this.form.reset();
      setTimeout(() => {
        this.success = null;
      }, 3000);
    }, 1000);
  }

}

