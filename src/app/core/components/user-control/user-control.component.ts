import { Component, inject, afterNextRender, OnDestroy, OnInit, Input, Output, EventEmitter, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { Popover } from 'primeng/popover';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-user-control',
  standalone: true,
  imports: [CommonModule, ButtonModule, AvatarModule, Popover],
  templateUrl: './user-control.component.html',
  styleUrl: './user-control.component.scss',
})
export class UserControlComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);

  /** Estado del modo oscuro (desde el padre). */
  @Input() darkMode = false;
  /** Emite cuando el usuario cambia el modo oscuro/claro. */
  @Output() toggleDarkMode = new EventEmitter<void>();

  userData: any = null;
  companyDescription: string = '';
  /** NIT de la empresa (número de identificación tributaria) */
  companyNit: string = '';
  private routerSubscription?: Subscription;

  constructor() {
    // Suscribirse a cambios de ruta para actualizar datos del usuario (después del primer render)
    afterNextRender(() => {
      this.routerSubscription = this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.loadUserData();
        });
    });
  }

  ngOnInit(): void {
    // Cargar datos del usuario al iniciar para que el navbar muestre el usuario de inmediato (dash_informativo, consulta, extern)
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserData();
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadUserData(): void {
    const data = this.authService.getUserData();
    this.userData = data;
    this.companyDescription = data?.companyName || data?.companyDescription || '';
    // NIT: prioridad companyNumberIdentity (nuevo), fallback companyDescription (legacy backend)
    this.companyNit = data?.companyNumberIdentity ?? data?.companyDescription ?? '';
  }

  /** Usuario solo externo (GESTOR_EXTERNO_OBSERVE sin roles POS): no tiene turno, no se pide cierre de turno. */
  private get isExternalUserOnly(): boolean {
    const roles = this.authService.getUserData()?.roles ?? [];
    if (!roles.includes('GESTOR_EXTERNO_OBSERVE')) return false;
    return !roles.some((r: string) => UserControlComponent.POS_FULL_ACCESS.includes(r));
  }

  logout(): void {
    if (this.isExternalUserOnly) {
      this.userData = null;
      this.authService.logout();
      return;
    }
    this.authService.logoutRequest(environment.serviceCode).subscribe({
      next: () => {
        this.userData = null;
        this.authService.logout();
      },
      error: (err) => {
        const mustFinishShift = err?.error?.wbErrorCode === 'MUST_FINISH_SHIFT_BEFORE_LOGOUT';
        if (mustFinishShift) {
          this.notificationService.warn('Debe terminar el turno antes de cerrar sesión. Redirigiendo al POS.');
          this.router.navigate([environment.defaultPosPath]);
          return;
        }
        this.userData = null;
        this.authService.logout();
      }
    });
  }

  getInitials(): string {
    if (!this.userData) return 'U';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  }

  getFullName(): string {
    if (!this.userData) return 'Usuario';
    const firstName = this.userData.firstName || '';
    const lastName = this.userData.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Usuario';
  }

  navigateToChangePassword(): void {
    const path = this.canSeeOperaciones ? '/pos/change-password' : '/dash_informativo/change-password';
    this.router.navigate([path]);
  }

  navigateToChangePasswordAndClose(popover: Popover): void {
    popover.hide();
    this.navigateToChangePassword();
  }

  onLogoutClick(popover: Popover): void {
    popover.hide();
    this.logout();
  }

  /** Navega al dashboard POS (Ver operaciones) y cierra el menú. */
  navigateToOperacionesAndClose(popover: Popover): void {
    popover.hide();
    this.router.navigate([environment.defaultPosPath]);
  }

  /** Rol observer (GESTOR_EXTERNO_OBSERVE) no debe ver operaciones; solo datos vitales. */
  private static readonly POS_FULL_ACCESS = ['PARKING_ATTENDANT', 'SUPER_USER', 'SUPER_ADMIN', 'ADMINISTRATOR_PRINCIPAL', 'ADMIN_APP', 'AUDIT_SELLER'];

  get canSeeOperaciones(): boolean {
    const roles = this.authService.getUserData()?.roles ?? [];
    if (!roles.includes('GESTOR_EXTERNO_OBSERVE')) return true;
    return roles.some((r: string) => UserControlComponent.POS_FULL_ACCESS.includes(r));
  }

  onToggleDarkMode(): void {
    this.toggleDarkMode.emit();
  }
}

