import { Component, inject, computed, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ButtonModule } from 'primeng/button';
import { UserControlComponent } from '../../../core/components/user-control/user-control.component';

@Component({
  selector: 'app-dash-informativo-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, UserControlComponent],
  templateUrl: './dash-informativo-layout.component.html',
  styleUrls: ['./dash-informativo-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashInformativoLayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;
  readonly currentTime = signal('');
  private timeInterval?: ReturnType<typeof setInterval>;

  readonly companyName = computed(() =>
    this.authService.getUserData()?.companyName ?? this.authService.getUserData()?.companyDescription ?? 'Carton America'
  );

  private readonly allMenuItems: { label: string; icon: string; routerLink: string; roles?: string[] }[] = [
    { label: 'Carton America', icon: 'pi pi-truck', routerLink: 'carton-america' },
    { label: 'Visualizar salida de vehículos', icon: 'pi pi-car', routerLink: 'salida-vehiculos', roles: ['GESTOR_EXTERNO_EDIT', 'GESTOR_EXTERNO_EXITS'] }
  ];

  /** Ítems visibles según los roles del usuario. */
  readonly menuItems = computed(() => {
    const roles = this.authService.getUserData()?.roles ?? [] as string[];
    return this.allMenuItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.some((r: string) => roles.includes(r));
    });
  });

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

  showMobileOverlay(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 && this.sidebarService.mobileMenuOpen();
  }

  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }

  ngOnInit(): void {
    this.updateCurrentTime();
    this.timeInterval = setInterval(() => this.updateCurrentTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private updateCurrentTime(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));
  }
}
