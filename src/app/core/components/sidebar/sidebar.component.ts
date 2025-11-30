import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
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

  // Computed signal para mejorar la accesibilidad y legibilidad del template
  readonly ariaLabel = computed(() => 
    this.collapsed() ? 'Expandir sidebar' : 'Colapsar sidebar'
  );

  readonly ariaExpanded = computed(() => !this.collapsed());

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }
}

