import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuItems = signal<MenuItem[]>([
    {
      label: 'Punto de Venta',
      icon: 'pi pi-shopping-cart',
      routerLink: '/pos',
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
}

