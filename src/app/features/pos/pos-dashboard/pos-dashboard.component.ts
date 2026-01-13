import { Component, ViewEncapsulation, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { RegistrarPlacaComponent } from '../registrar-placa/registrar-placa.component';
import { RegistrarSalidaComponent } from '../registrar-salida/registrar-salida.component';
import { ClosedTransactionService, ClosedTransactionStats } from '../../../core/services/closed-transaction.service';
import { NotificationService } from '../../../core/services/notification.service';
import { catchError, of, Subject, takeUntil, finalize } from 'rxjs';

type ViewType = 'dashboard' | 'ingresar' | 'salida';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    RegistrarPlacaComponent,
    RegistrarSalidaComponent
  ],
  templateUrl: './pos-dashboard.component.html',
  styleUrls: ['./pos-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PosDashboardComponent implements OnInit, OnDestroy {
  private closedTransactionService = inject(ClosedTransactionService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  
  currentView: ViewType = 'dashboard';
  stats: ClosedTransactionStats | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadStats();
    // Escuchar eventos de actualización desde otros componentes
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupEventListeners(): void {
    // Escuchar eventos personalizados para recargar estadísticas
    window.addEventListener('transactionClosed', () => {
      if (this.currentView === 'dashboard') {
        this.loadStats();
      }
    });
  }

  loadStats(): void {
    // Siempre cargar cuando se llama este método
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges(); // Forzar detección de cambios para mostrar loading
    
    this.closedTransactionService.getTodayStats()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // Asegurar que loading se establezca en false siempre
          this.loading = false;
          this.cdr.detectChanges(); // Forzar detección de cambios
        }),
        catchError(err => {
          const status = err?.status;
          const errorResponse = err?.error;
          
          // Si es error 412 (PRECONDITION_FAILED), mostrar el mensaje del backend
          if (status === 412) {
            const errorMessage = errorResponse?.message || errorResponse?.error || 'Error de validación';
            const errorDetails = errorResponse?.details || errorResponse?.detail;
            
            // Mostrar notificación con el mensaje del backend
            this.notificationService.showPreconditionFailed(errorMessage, errorDetails);
            this.error = errorMessage;
          } else {
            // Para otros errores, mostrar mensaje genérico
            const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
            this.notificationService.error(genericMessage);
            this.error = err?.error?.message || 'Error al cargar estadísticas';
          }
          
          return of(null);
        })
      )
      .subscribe({
        next: (data) => {
          // Actualizar inmediatamente cuando lleguen los datos
          if (data) {
            this.stats = data;
            this.cdr.detectChanges(); // Forzar detección de cambios para mostrar datos
          }
        }
      });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  showIngresar(): void {
    this.currentView = 'ingresar';
  }

  showSalida(): void {
    this.currentView = 'salida';
  }

  showDashboard(): void {
    this.currentView = 'dashboard';
    // Siempre cargar estadísticas cuando se muestra el dashboard
    this.loadStats();
  }
}

