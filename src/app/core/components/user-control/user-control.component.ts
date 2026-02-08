import { Component, inject, afterNextRender, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClosedTransactionService } from '../../services/closed-transaction.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-user-control',
  standalone: true,
  imports: [CommonModule, ButtonModule, AvatarModule],
  templateUrl: './user-control.component.html',
})
export class UserControlComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private closedTransactionService = inject(ClosedTransactionService);
  private notificationService = inject(NotificationService);

  userData: any = null;
  companyDescription: string = '';
  /** NIT de la empresa (número de identificación tributaria) */
  companyNit: string = '';
  private routerSubscription?: Subscription;

  constructor() {
    // Cargar datos del usuario solo en el navegador
    afterNextRender(() => {
      this.loadUserData();

      // Suscribirse a cambios de ruta para actualizar datos del usuario
      // Esto asegura que los datos se actualicen después del login
      this.routerSubscription = this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.loadUserData();
        });
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadUserData(): void {
    const data = this.authService.getUserData();
    this.userData = data;
    this.companyDescription = data?.companyName || data?.companyDescription || '';
    // NIT: prioridad companyNumberIdentity (nuevo), fallback companyDescription (legacy backend)
    this.companyNit = data?.companyNumberIdentity ?? data?.companyDescription ?? '';
  }

  logout(): void {
    this.closedTransactionService.getParams(environment.serviceCode).subscribe({
      next: (params) => {
        if (params?.mustFinishShiftBeforeLogout) {
          this.notificationService.warn('Debe terminar el turno antes de cerrar sesión. Redirigiendo al POS.');
          this.router.navigate([environment.defaultPosPath]);
          return;
        }
        this.userData = null;
        this.authService.logout();
      },
      error: () => {
        this.userData = null;
        this.authService.logout();
      }
    });
  }

  getInitials(): string {
    if (!this.userData) return 'U';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  getFullName(): string {
    if (!this.userData) return 'Usuario';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Usuario';
  }

  navigateToChangePassword(): void {
    this.router.navigate(['/pos/change-password']);
  }
}

