export interface MenuItem {
  label: string;
  icon?: string;
  routerLink?: string;
  items?: MenuItem[];
  command?: () => void;
  visible?: boolean;
  badge?: string;
  badgeClass?: string;
  expanded?: boolean; // Estado expandido/colapsado para items con submenu
  id?: string; // ID único para identificar items (útil para agregar sub-items dinámicamente)
}

