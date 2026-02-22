import { Injectable, inject, signal, computed } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';
import { AuthService } from './auth.service';

/** Roles que tienen acceso completo al menú POS (no solo consulta). */
const POS_FULL_ACCESS_ROLES = [
  'PARKING_ATTENDANT',
  'SUPER_USER',
  'SUPER_ADMIN',
  'ADMINISTRATOR_PRINCIPAL',
  'ADMIN_APP',
  'AUDIT_SELLER'
] as const;

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private auth = inject(AuthService);

  private baseMenuItems = signal<MenuItem[]>([
    {
      label: 'Ingresar Vehículo',
      icon: 'pi pi-sign-in',
      routerLink: '/pos/ingresar-vehiculo',
      visible: true
    },
    {
      label: 'Registrar Salida',
      icon: 'pi pi-sign-out',
      routerLink: '/pos/registrar-salida',
      visible: true
    },
    {
      label: 'Vehículos en Parqueadero',
      icon: 'pi pi-car',
      routerLink: '/pos/vehiculos-parqueadero',
      visible: true
    },
    {
      label: 'Parqueo Cartón América',
      icon: 'pi pi-truck',
      routerLink: '/pos/orden-llegada-carton-america',
      visible: true
    }
  ]);

  /** Si el usuario solo tiene rol GESTOR_EXTERNO_OBSERVE, solo puede ver Datos Vitales (solo consulta). */
  private isObserverOnly(roles: string[]): boolean {
    if (!roles.includes('GESTOR_EXTERNO_OBSERVE')) return false;
    return !roles.some(r => (POS_FULL_ACCESS_ROLES as readonly string[]).includes(r));
  }

  private filteredMenuItems = computed(() => {
    const items = this.baseMenuItems().filter(item => item.visible !== false);
    const roles = this.auth.getUserData()?.roles ?? [];
    if (this.isObserverOnly(roles)) {
      return []; // Gestor externo usa /consulta (otro main), no ve menú POS
    }
    return items;
  });

  getMenuItems() {
    return this.filteredMenuItems;
  }

  addMenuItem(item: MenuItem) {
    this.baseMenuItems.update(items => [...items, item]);
  }

  removeMenuItem(label: string) {
    this.baseMenuItems.update(items => items.filter(item => item.label !== label));
  }

  clearMenu() {
    this.baseMenuItems.set([]);
  }

  /**
   * Agrega un sub-item a un item del menú existente
   * @param parentId ID del item padre
   * @param subItem Nuevo sub-item a agregar
   */
  addSubItem(parentId: string, subItem: MenuItem): void {
    this.baseMenuItems.update(items => {
      return items.map(item => {
        if (item.id === parentId) {
          const updatedItems = item.items ? [...item.items, subItem] : [subItem];
          return { ...item, items: updatedItems };
        }
        return item;
      });
    });
  }

  /**
   * Remueve un sub-item de un item del menú
   * @param parentId ID del item padre
   * @param subItemLabel Label del sub-item a remover
   */
  removeSubItem(parentId: string, subItemLabel: string): void {
    this.baseMenuItems.update(items => {
      return items.map(item => {
        if (item.id === parentId && item.items) {
          const updatedItems = item.items.filter(subItem => subItem.label !== subItemLabel);
          return { ...item, items: updatedItems };
        }
        return item;
      });
    });
  }

  /**
   * Toggle el estado expandido/colapsado de un item del menú
   * @param itemId ID del item
   */
  toggleMenuItem(itemId: string): void {
    this.baseMenuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded };
        }
        return item;
      });
    });
  }

  /**
   * Expande un item del menú
   * @param itemId ID del item
   */
  expandMenuItem(itemId: string): void {
    this.baseMenuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: true };
        }
        return item;
      });
    });
  }

  /**
   * Colapsa un item del menú
   * @param itemId ID del item
   */
  collapseMenuItem(itemId: string): void {
    this.baseMenuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: false };
        }
        return item;
      });
    });
  }
}

