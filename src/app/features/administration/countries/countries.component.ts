import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CountryService, Country } from '../../../core/services/country.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { Subscription, timeout } from 'rxjs';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss']
})
export class CountriesComponent implements OnInit, OnDestroy {
  countries: Country[] = [];
  loading = false;
  showForm = false;
  editingCountry: Country | null = null;
  error: string | null = null;
  searchDescription = '';
  private subscription?: Subscription;

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'countryId', header: 'ID', width: '80px' },
    { field: 'name', header: 'Nombre', width: '200px' },
    { field: 'description', header: 'Descripción', width: '250px' },
    { field: 'isoCode', header: 'Código ISO', width: '120px' },
    { field: 'timezone', header: 'Zona Horaria', width: '150px' },
    { field: 'lang', header: 'Idioma', width: '120px' },
    { field: 'currency', header: 'Moneda', width: '120px' }
  ];

  tableData: any = {
    data: [],
    totalRecords: 0,
    isFirst: true
  };

  form: FormGroup;

  constructor(
    private countryService: CountryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      isoCode: [''],
      timezone: [''],
      lang: [''],
      currency: ['']
    });
  }

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    // Cancelar suscripción anterior si existe
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    const description = this.searchDescription.trim() || undefined;
    
    this.subscription = this.countryService.getCountries(undefined, description)
      .pipe(
        timeout(30000) // Timeout de 30 segundos
      )
      .subscribe({
        next: (data) => {
          console.log('Países recibidos:', data);
          this.countries = Array.isArray(data) ? data : [];
          this.tableData = {
            data: this.countries,
            totalRecords: this.countries.length,
            isFirst: true
          };
          // Ocultar spinner inmediatamente y forzar detección de cambios
          this.loading = false;
          this.cdr.detectChanges();
          console.log('Países asignados:', this.countries.length);
        },
        error: (err) => {
          console.error('Error completo:', err);
          this.error = err?.error?.message || err?.message || 'Error al cargar los países';
          this.countries = [];
          // Ocultar spinner inmediatamente en caso de error y forzar detección de cambios
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  search(): void {
    this.loadCountries();
  }

  openCreateForm(): void {
    this.editingCountry = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(country: Country): void {
    this.editingCountry = country;
    this.form.patchValue({
      name: country.name || '',
      description: country.description || '',
      isoCode: country.isoCode || '',
      timezone: country.timezone || '',
      lang: country.lang || '',
      currency: country.currency || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingCountry = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const countryData: Country = {
      ...this.form.value
    };

    if (this.editingCountry?.countryId) {
      countryData.countryId = this.editingCountry.countryId;
    }

    const operation = this.editingCountry
      ? this.countryService.updateCountry(countryData)
      : this.countryService.createCountry(countryData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingCountry = null;
        this.form.reset();
        this.loadCountries();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar el país';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && confirm(`¿Está seguro de eliminar el país "${selected.name}"?`)) {
      // Nota: El backend no tiene endpoint DELETE, pero se puede implementar aquí si se agrega
      this.error = 'La funcionalidad de eliminar no está disponible en el backend';
    }
  }

  onTablePagination(event: any): void {
    // Para países no hay paginación server-side, pero se puede implementar aquí
    console.log('Página solicitada:', event);
  }

  deleteCountry(country: Country): void {
    if (!confirm(`¿Está seguro de eliminar el país "${country.name}"?`)) {
      return;
    }
    // Nota: El backend no tiene endpoint DELETE, pero se puede implementar aquí si se agrega
    this.error = 'La funcionalidad de eliminar no está disponible en el backend';
  }
}

