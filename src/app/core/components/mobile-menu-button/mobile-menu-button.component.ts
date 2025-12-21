import { Component, inject, ChangeDetectionStrategy, HostListener, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-mobile-menu-button',
  standalone: true,
  imports: [],
  templateUrl: './mobile-menu-button.component.html',
  styleUrls: ['./mobile-menu-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileMenuButtonComponent {
  private readonly sidebarService = inject(SidebarService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;

  constructor() {
    // Forzar detección de cambios después del render inicial
    afterNextRender(() => {
      this.cdr.markForCheck();
    });
  }

  toggleMobileMenu(): void {
    this.sidebarService.toggleMobileMenu();
    this.cdr.markForCheck();
  }
  
  @HostListener('window:resize')
  onResize(): void {
    // Si cambia a desktop, cerrar el menú móvil
    if (typeof window !== 'undefined' && window.innerWidth > 768 && this.mobileMenuOpen()) {
      this.sidebarService.closeMobileMenu();
    }
    this.cdr.markForCheck();
  }
}

