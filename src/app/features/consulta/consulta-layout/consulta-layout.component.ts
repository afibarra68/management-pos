import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ButtonModule } from 'primeng/button';
import { UserControlComponent } from '../../../core/components/user-control/user-control.component';

@Component({
  selector: 'app-consulta-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, UserControlComponent],
  templateUrl: './consulta-layout.component.html',
  styleUrls: ['./consulta-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultaLayoutComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;
  readonly companyName = computed(() => this.authService.getUserData()?.companyName ?? this.authService.getUserData()?.companyDescription ?? 'Consulta');

  /** Rutas relativas para que funcionen bajo /informacion-vital o /consulta */
  readonly menuItems: { label: string; icon: string; routerLink: string }[] = [
    { label: 'Carton America', icon: 'pi pi-truck', routerLink: 'dash_informativo' }
  ];

  isActive(routerLink: string): boolean {
    return this.router.url === routerLink || this.router.url.startsWith(routerLink + '/');
  }

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarService.toggleMobileMenu();
    } else {
      this.sidebarService.toggle();
    }
  }

  closeMobileMenu(): void {
    this.sidebarService.closeMobileMenu();
  }

  /** Para el overlay móvil: solo en navegador y vista <= 768px con menú abierto. */
  showMobileOverlay(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 && this.sidebarService.mobileMenuOpen();
  }
}
