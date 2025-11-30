import { Component, signal, inject, afterNextRender, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { UserControlComponent } from './core/components/user-control/user-control.component';
import { CommonModule } from '@angular/common';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SidebarService } from './core/services/sidebar.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, UserControlComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('t-parking');
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);
  
  // Usar computed para derivar el estado del sidebar colapsado directamente del servicio
  readonly sidebarCollapsed = computed(() => this.sidebarService.collapsed());
  
  // Signal para controlar la visibilidad del sidebar
  private readonly isAuthenticated = signal(false);
  private readonly currentRoute = signal<string>('');
  
  // Computed signal para mostrar/ocultar sidebar
  readonly showSidebar = computed(() => {
    const auth = this.isAuthenticated();
    const route = this.currentRoute();
    const isAuthPage = route.startsWith('/auth') || route === '/login';
    return auth && !isAuthPage;
  });

  constructor() {
    // Usar afterNextRender para ejecutar código solo en el navegador
    afterNextRender(() => {
      // Función para verificar y actualizar el estado del sidebar
      const updateSidebarState = () => {
        const currentUrl = this.router.url;
        const isAuthenticated = this.authService.isAuthenticated();
        
        // Solo actualizar si los valores han cambiado para evitar re-renderizados innecesarios
        if (this.currentRoute() !== currentUrl) {
          this.currentRoute.set(currentUrl);
        }
        if (this.isAuthenticated() !== isAuthenticated) {
          this.isAuthenticated.set(isAuthenticated);
        }
      };

      // Verificar estado inicial
      updateSidebarState();

      // Suscribirse a cambios de ruta con distinctUntilChanged para evitar actualizaciones duplicadas
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          distinctUntilChanged((prev: NavigationEnd, curr: NavigationEnd) => prev.url === curr.url)
        )
        .subscribe(() => {
          updateSidebarState();
        });
    });
  }
}
