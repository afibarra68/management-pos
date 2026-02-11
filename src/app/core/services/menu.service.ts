import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuItems = signal<MenuItem[]>([
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
    },
    {
      label: 'Capacidad',
      icon: 'pi pi-th-large',
      routerLink: '/pos/mapa-puestos',
      visible: true
    },
    {
      label: 'Ingreso a Caja por Otro Concepto',
      icon: 'pi pi-money-bill',
      routerLink: '/pos/ingreso-caja-otro-concepto',
      visible: true
    }
    // Aquí se pueden agregar más items del menú dinámicamente
  ]);

  getMenuItems() {
    return this.menuItems.asReadonly();
  }

  addMenuItem(item: MenuItem) {
    this.menuItems.update(items => [...items, item]);
  }

  removeMenuItem(label: string) {
    this.menuItems.update(items => items.filter(item => item.label !== label));
  }

  clearMenu() {
    this.menuItems.set([]);
  }

  /**
   * Agrega un sub-item a un item del menú existente
   * @param parentId ID del item padre
   * @param subItem Nuevo sub-item a agregar
   */
  addSubItem(parentId: string, subItem: MenuItem): void {
    this.menuItems.update(items => {
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
    this.menuItems.update(items => {
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
    this.menuItems.update(items => {
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
    this.menuItems.update(items => {
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
    this.menuItems.update(items => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: false };
        }
        return item;
      });
    });
  }
}

