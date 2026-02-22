import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ButtonModule } from 'primeng/button';
import { UserControlComponent } from '../../../core/components/user-control/user-control.component';

@Component({
  selector: 'app-extern-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, UserControlComponent],
  templateUrl: './extern-layout.component.html',
  styleUrls: ['./extern-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExternLayoutComponent {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;
  readonly companyName = computed(() =>
    this.authService.getUserData()?.companyName ?? this.authService.getUserData()?.companyDescription ?? 'Extern'
  );

  readonly menuItems: { label: string; icon: string; routerLink: string }[] = [
    { label: 'Carton America', icon: 'pi pi-truck', routerLink: '' }
  ];

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
}
