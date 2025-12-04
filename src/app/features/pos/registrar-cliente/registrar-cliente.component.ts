import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared-module';
import { ClientService, Client } from '../../../core/services/client.service';
import { UtilsService } from '../../../core/services/utils.service';

@Component({
  selector: 'app-registrar-cliente',
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
  templateUrl: './registrar-cliente.component.html',
  styleUrls: ['./registrar-cliente.component.scss']
})
export class RegistrarClienteComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  typeIdentityOptions = [
    { label: 'Cédula de Ciudadanía', value: 'CC' },
    { label: 'Cédula de Extranjería', value: 'CE' },
    { label: 'NIT', value: 'NIT' },
    { label: 'Pasaporte', value: 'PASAPORTE' },
    { label: 'Tarjeta de Identidad', value: 'TI' }
  ];

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    public router: Router,
    private utilsService: UtilsService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      typeIdentity: ['CC', [Validators.required]],
      numberIdentity: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
      people: [''],
      paymentDay: [null]
    });
  }

  ngOnInit(): void {
    // El componente está listo
  }

  getMaxDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.error = 'Por favor complete todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const clientData: Client = {
      fullName: this.form.value.fullName.trim(),
      typeIdentity: this.form.value.typeIdentity,
      numberIdentity: this.form.value.numberIdentity.trim(),
      people: this.form.value.people?.trim() || undefined,
      paymentDay: this.form.value.paymentDay || undefined
    };

    this.clientService.create(clientData).subscribe({
      next: (response) => {
        this.loading = false;
        this.utilsService.showSuccess(
          `Cliente ${response.fullName} registrado exitosamente`,
          'Cliente Registrado'
        );
        this.form.reset();
        this.form.patchValue({ typeIdentity: 'CC' }); // Resetear a valor por defecto
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al registrar el cliente';
        this.utilsService.showError(
          err?.error?.message || 'Error al registrar el cliente',
          'Error en el Registro'
        );
      }
    });
  }

}

