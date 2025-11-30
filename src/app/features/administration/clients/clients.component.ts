import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ClientService, Client, Page } from '../../../core/services/client.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-clients',
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
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  loading = false;
  showForm = false;
  editingClient: Client | null = null;
  error: string | null = null;
  searchDocument = '';
  
  // Paginación
  totalRecords = 0;
  page = 0;
  size = 10;
  first = 0;

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'clientId', header: 'ID', width: '80px' },
    { field: 'fullName', header: 'Nombre Completo', width: '200px' },
    { field: 'typeIdentity', header: 'Tipo Identidad', width: '150px' },
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'people', header: 'Personas', width: '120px' },
    { field: 'paymentDay', header: 'Día de Pago', width: '150px' },
    { field: 'clientCompanyId', header: 'ID Compañía', width: '120px' }
  ];

  tableData: any = {
    data: [],
    totalRecords: 0,
    isFirst: true
  };

  form: FormGroup;

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      typeIdentity: [''],
      numberIdentity: [''],
      people: [''],
      clientCompanyId: [null]
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.error = null;
    const document = this.searchDocument.trim() || undefined;
    this.clientService.getClients(document, this.page, this.size).subscribe({
      next: (data: Page<Client>) => {
        this.clients = data.content;
        this.totalRecords = data.totalElements;
        this.tableData = {
          data: this.clients,
          totalRecords: this.totalRecords,
          isFirst: this.page === 0
        };
        // Ocultar spinner inmediatamente cuando llegan los datos y forzar detección de cambios
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar los clientes';
        // Ocultar spinner inmediatamente en caso de error y forzar detección de cambios
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error:', err);
      }
    });
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.loadClients();
  }

  onPageChange(event: any): void {
    this.page = event.page;
    this.size = event.rows;
    this.first = event.first;
    this.loadClients();
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || 10;
    this.first = event.first || 0;
    this.loadClients();
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && confirm(`¿Está seguro de eliminar el cliente "${selected.fullName}"?`)) {
      // Implementar lógica de eliminación si está disponible
      this.error = 'La funcionalidad de eliminar no está disponible';
    }
  }

  openCreateForm(): void {
    this.editingClient = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(client: Client): void {
    this.editingClient = client;
    this.form.patchValue({
      fullName: client.fullName || '',
      typeIdentity: client.typeIdentity || '',
      numberIdentity: client.numberIdentity || '',
      people: client.people || '',
      clientCompanyId: client.clientCompanyId || null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingClient = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Excluir paymentDay del objeto a enviar
    const { paymentDay, ...formData } = this.form.value;
    const clientData: Client = {
      ...formData
    };

    if (this.editingClient?.clientId) {
      clientData.clientId = this.editingClient.clientId;
    }

    const operation = this.editingClient
      ? this.clientService.updateClient(clientData)
      : this.clientService.createClient(clientData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingClient = null;
        this.form.reset();
        this.loadClients();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar el cliente';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }
}

