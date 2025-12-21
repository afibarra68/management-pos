import { Component, inject, computed, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DynamicMenuComponent } from '../dynamic-menu/dynamic-menu.component';
import { ButtonModule } from 'primeng/button';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, DynamicMenuComponent, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly sidebarService = inject(SidebarService);

  // Exponer directamente el ReadonlySignal del servicio
  // Angular 20: Uso directo de signals sin necesidad de effect() o computed()
  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;

  // Computed signal para mejorar la accesibilidad y legibilidad del template
  readonly ariaLabel = computed(() =>
    this.collapsed() ? 'Expandir sidebar' : 'Colapsar sidebar'
  );

  readonly ariaExpanded = computed(() => !this.collapsed());

  readonly isMobile = computed(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.sidebarService.toggleMobileMenu();
    } else {
      this.sidebarService.toggle();
    }
  }

  closeMobileMenu(): void {
    if (this.isMobile()) {
      this.sidebarService.closeMobileMenu();
    }
  }

  // Cerrar menú móvil al hacer clic fuera o al navegar
  @HostListener('window:resize')
  onResize(): void {
    // Si cambia a desktop, cerrar el menú móvil
    if (typeof window !== 'undefined' && window.innerWidth > 768 && this.mobileMenuOpen()) {
      this.sidebarService.closeMobileMenu();
    }
  }
}

