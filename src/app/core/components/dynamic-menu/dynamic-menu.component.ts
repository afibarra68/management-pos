import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicMenuComponent {
  private readonly menuService = inject(MenuService);
  
  // Usar computed signal para derivar los items visibles del menú
  // Esto evita re-renderizados innecesarios y mantiene el componente estático
  readonly menuItems = computed(() => {
    const items = this.menuService.getMenuItems()();
    return items.filter(item => item.visible !== false);
  });
}

