import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { OpenTransactionService } from '../../../core/services/open-transaction.service';
import { OpenTransaction } from '../../../core/services/open-transaction.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { UtilsService } from '../../../core/services/utils.service';
import { PrintService } from '../../../core/services/print.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SelectItem } from 'primeng/api';

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
    ConfirmDialogModule,
    ToastModule,
    SharedModule
  ],
  templateUrl: './registrar-placa.component.html',
  styleUrls: ['./registrar-placa.component.scss']
})
export class RegistrarPlacaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingTipos = false;
  error: string | null = null;
  success: string | null = null;
  tipoVehiculoOptions: SelectItem[] = [];

  constructor(
    private fb: FormBuilder,
    private openTransactionService: OpenTransactionService,
    private enumService: EnumService,
    public router: Router,
    private utilsService: UtilsService,
    private printService: PrintService
  ) {
    this.form = this.fb.group({
      vehiclePlate: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      tipoVehiculo: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadTiposVehiculo();
  }

  private loadTiposVehiculo(): void {
    this.loadingTipos = true;
    this.enumService.getEnumByName('ETipoVehiculo').subscribe({
      next: (tipos: EnumResource[]) => {
        this.tipoVehiculoOptions = tipos.map(tipo => ({
          label: tipo.description || tipo.id,
          value: tipo.id
        }));
        this.loadingTipos = false;
      },
      error: (err) => {
        this.loadingTipos = false;
        console.error('Error al cargar tipos de vehículo:', err);
        // Fallback a valores por defecto si falla la carga
        this.tipoVehiculoOptions = [
          { label: 'Automóvil', value: 'AUTOMOVIL' },
          { label: 'Motocicleta', value: 'MOTOCICLETA' },
          { label: 'Camioneta', value: 'CAMIONETA' },
          { label: 'Camión', value: 'CAMION' }
        ];
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.error = 'Por favor complete todos los campos requeridos';
      return;
    }

    const vehiclePlate = this.form.value.vehiclePlate.toUpperCase().trim();
    const tipoVehiculo = this.form.value.tipoVehiculo as string;

    // Mostrar diálogo de confirmación
    this.utilsService.confirmVehicleEntry(vehiclePlate).subscribe({
      next: (confirmed) => {
        if (confirmed) {
          this.processRegistration(vehiclePlate, tipoVehiculo);
        }
      }
    });
  }

  private processRegistration(vehiclePlate: string, tipoVehiculo: string): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    // Enviamos la placa y el tipo de vehículo, el backend agrega el resto de la información
    // El servicio de negocio se asociará cuando se cierre la transacción a través de la tarifa aplicada
    const transactionData: OpenTransaction = {
      vehiclePlate: vehiclePlate,
      tipoVehiculo: tipoVehiculo
    };

    this.openTransactionService.create(transactionData).subscribe({
      next: (response) => {
        this.loading = false;
        this.utilsService.showSuccess(
          `Placa ${response.vehiclePlate} registrada exitosamente`,
          'Ingreso Confirmado'
        );
        this.form.reset();

        // Enviar ticket a imprimir si viene en la respuesta
        if (response.buildTicket) {
          this.printTicket(response.buildTicket);
        }
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

  /**
   * Envía el ticket a imprimir al servicio parking-printing
   * @param buildTicket Objeto con el template y datos de la impresora
   */
  private printTicket(buildTicket: any): void {
    if (!buildTicket || !buildTicket.template) {
      console.warn('No se puede imprimir: buildTicket o template no disponible');
      return;
    }

    this.printService.printTicket(buildTicket).subscribe({
      next: () => {
        console.log('Ticket enviado a imprimir exitosamente');
      },
      error: (err) => {
        console.error('Error al enviar ticket a imprimir:', err);
        // No mostramos error al usuario ya que el registro fue exitoso
        // Solo lo registramos en consola
      }
    });
  }
}
