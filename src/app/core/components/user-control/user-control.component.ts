import { Component, inject, afterNextRender, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

  userData: any = null;
  companyDescription: string = '';
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
    // Obtener companyDescription del usuario o usar companyName como fallback
    this.companyDescription = data?.companyDescription || data?.companyName || '';
  }

  logout(): void {
    // Limpiar la variable local del componente antes de hacer logout
    this.userData = null;
    // Ejecutar logout del servicio
    this.authService.logout();
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
}

