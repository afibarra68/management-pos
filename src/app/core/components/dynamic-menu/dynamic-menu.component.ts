import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { SidebarService } from '../../services/sidebar.service';
import { MenuItem } from '../../models/menu-item.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dynamic-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicMenuComponent {
  private readonly menuService = inject(MenuService);
  private readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  // Usar computed signal para derivar los items visibles del menú
  // Esto evita re-renderizados innecesarios y mantiene el componente estático
  readonly menuItems = computed(() => {
    const items = this.menuService.getMenuItems()();
    return items.filter(item => item.visible !== false);
  });

  // Exponer el estado colapsado del sidebar
  readonly collapsed = this.sidebarService.collapsed;
  readonly mobileMenuOpen = this.sidebarService.mobileMenuOpen;

  readonly isMobile = computed(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  constructor() {
    // Cerrar el menú móvil al navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile() && this.mobileMenuOpen()) {
          this.sidebarService.closeMobileMenu();
        }
      });
  }

  onMenuClick(): void {
    // Cerrar el menú móvil al hacer clic en un enlace
    if (this.isMobile() && this.mobileMenuOpen()) {
      this.sidebarService.closeMobileMenu();
    }
  }

  /**
   * Verifica si un item tiene submenu
   */
  hasSubmenu(item: MenuItem): boolean {
    return !!(item.items && item.items.length > 0);
  }

  /**
   * Maneja el click en un item padre con submenu
   * Toggle el estado expandido/colapsado
   */
  onParentClick(event: Event, item: MenuItem): void {
    if (item.items && item.items.length > 0 && item.id) {
      event.preventDefault();
      event.stopPropagation();
      this.menuService.toggleMenuItem(item.id);
    }
  }

  /**
   * Verifica si un item está expandido
   */
  isExpanded(item: MenuItem): boolean {
    return item.expanded === true;
  }
}

