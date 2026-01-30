import { Component, signal, inject, afterNextRender, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { UserControlComponent } from './core/components/user-control/user-control.component';
import { CommonModule } from '@angular/common';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SidebarService } from './core/services/sidebar.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, UserControlComponent, CommonModule, ToastModule, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnDestroy {
  protected readonly title = signal('t-parking');
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  // Modo oscuro global
  darkMode = signal(false);

  // Hora actual
  currentTime = signal('');
  private timeInterval?: ReturnType<typeof setInterval>;

  // Nombre de la empresa
  companyName = signal<string>('');

  // Usar computed para derivar el estado del sidebar colapsado directamente del servicio
  // Esto se actualiza automáticamente cuando el sidebar cambia
  readonly sidebarCollapsed = computed(() => this.sidebarService.collapsed());

  // Signal para controlar la visibilidad del sidebar
  // Inicializar con el estado de autenticación actual para evitar que el login aparezca brevemente
  private readonly isAuthenticated = signal(this.authService.isAuthenticated());
  private readonly currentRoute = signal<string>('');

  // Computed signal para mostrar/ocultar sidebar
  readonly showSidebar = computed(() => {
    const auth = this.isAuthenticated();
    const route = this.currentRoute();
    const isAuthPage = route.startsWith('/auth') || route === '/login';
    return auth && !isAuthPage;
  });

  toggleDarkMode(): void {
    this.darkMode.set(!this.darkMode());
    this.saveDarkModePreference();
    this.updateTheme();
  }

  private loadDarkModePreference(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('jp_truck_dark_mode');
      // Ignorar prefers-color-scheme del sistema, solo usar preferencia guardada
      this.darkMode.set(saved === 'true');
      this.updateTheme();
    } else {
      // Por defecto, modo claro (ignorar temas del sistema)
      this.darkMode.set(false);
      this.updateTheme();
    }
  }

  private saveDarkModePreference(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('jp_truck_dark_mode', String(this.darkMode()));
    }
  }

  private updateTheme(): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      const html = document.documentElement;

      if (this.darkMode()) {
        body.classList.add('dark-mode');
        html.classList.add('dark-mode');
        // Prevenir que el sistema operativo afecte los colores
        html.style.colorScheme = 'dark';
      } else {
        body.classList.remove('dark-mode');
        html.classList.remove('dark-mode');
        // Forzar modo claro, ignorar preferencias del sistema
        html.style.colorScheme = 'light';
      }
    }
  }

  // Computed signal para calcular el ancho del header basado en el estado del sidebar
  readonly headerWidth = computed(() => {
    if (!this.showSidebar()) {
      return '100%';
    }
    return this.sidebarCollapsed() ? 'calc(100% - 60px)' : 'calc(100% - 260px)';
  });

  // Computed signal para calcular la posición izquierda del header
  readonly headerLeft = computed(() => {
    if (!this.showSidebar()) {
      return '0';
    }
    return this.sidebarCollapsed() ? '60px' : '260px';
  });

  goToDashboard(): void {
    this.router.navigate(['/pos']);
  }

  private startTimeUpdate(): void {
    // Actualizar inmediatamente
    this.updateCurrentTime();
    // Actualizar cada segundo
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);
  }

  private updateCurrentTime(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));
  }

  private loadCompanyName(): void {
    const userData = this.authService.getUserData();
    const companyNameValue = userData?.companyName || '';
    this.companyName.set(companyNameValue);
  }

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
        // Actualizar información de la empresa cuando cambia el estado de autenticación
        this.loadCompanyName();
      };

      // Verificar estado inicial
      updateSidebarState();

      // Cargar preferencia de modo oscuro
      this.loadDarkModePreference();

      // Cargar información de la empresa
      this.loadCompanyName();

      // Iniciar actualización de hora
      this.startTimeUpdate();

      // Suscribirse a cambios de ruta con distinctUntilChanged para evitar actualizaciones duplicadas
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          distinctUntilChanged((prev: NavigationEnd, curr: NavigationEnd) => prev.url === curr.url)
        )
        .subscribe(() => {
          updateSidebarState();
          // Cerrar el menú móvil al navegar
          this.sidebarService.closeMobileMenu();
        });
    });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }
}
