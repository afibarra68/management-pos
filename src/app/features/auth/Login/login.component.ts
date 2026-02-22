import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, LoginRequest, LoginResponse } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ShiftService } from '../../../core/services/shift.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    MessageModule,
    DialogModule,
    ProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  form: FormGroup;
  loading = false;
  showValidationModal = false;
  private notificationService = inject(NotificationService);
  private shiftService = inject(ShiftService);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Verificar autenticación en el constructor para redirigir antes de renderizar
    if (isPlatformBrowser(this.platformId) && this.auth.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getDefaultLandingPath();
      this.router.navigate([returnUrl], { replaceUrl: true });
    }

    this.form = this.fb.group({
      username: ['', Validators.required],
      accesKey: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Verificar nuevamente en caso de que el constructor no haya redirigido
      if (this.auth.isAuthenticated()) {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getDefaultLandingPath();
        this.router.navigate([returnUrl], { replaceUrl: true });
        return;
      }

      document.body.classList.add('login-page');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Desactivar autocompletado del campo de contraseña
      setTimeout(() => {
        const passwordInput = document.querySelector('#accesKey input[type="password"]') as HTMLInputElement;
        if (passwordInput) {
          passwordInput.setAttribute('autocomplete', 'new-password');
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('login-page');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  }

  get isFormValid(): boolean {
    const username = this.form.get('username')?.value || '';
    const password = this.form.get('accesKey')?.value || '';
    return username.trim().length > 0 && password.trim().length > 0 && !this.loading;
  }

  private static readonly POS_FULL_ACCESS = ['PARKING_ATTENDANT', 'SUPER_USER', 'SUPER_ADMIN', 'ADMINISTRATOR_PRINCIPAL', 'ADMIN_APP', 'AUDIT_SELLER'];

  private isObserverOnly(roles: string[] | undefined): boolean {
    if (!roles?.includes('GESTOR_EXTERNO_OBSERVE')) return false;
    return !roles.some(r => LoginComponent.POS_FULL_ACCESS.includes(r));
  }

  private getLandingPathForRoles(roles: string[] | undefined): string {
    return this.isObserverOnly(roles) ? '/dash_informativo' : (environment.defaultPosPath ?? '/pos');
  }

  private getDefaultLandingPath(): string {
    const roles = this.auth.getUserData()?.roles ?? [];
    return this.getLandingPathForRoles(roles);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const credentials: LoginRequest = this.form.value;

    this.auth.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        // Si debe cambiar la contraseña, redirigir al componente de cambio de contraseña
        if (response.mustChangePassword) {
          const changePwPath = this.isObserverOnly(response.roles) ? '/dash_informativo/change-password' : '/pos/change-password';
          this.router.navigate([changePwPath], {
            queryParams: { mustChange: 'true' },
            replaceUrl: true
          });
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getLandingPathForRoles(response.roles);
          this.router.navigateByUrl(returnUrl, { replaceUrl: true });
        }
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        const errorResponse = err?.error;
        const errorMessage = err?.message || '';
        const errorName = err?.name || '';

        // Detectar timeout o problemas de conexión
        const isTimeout = status === 0 ||
          status === null ||
          status === undefined ||
          errorName === 'TimeoutError' ||
          errorMessage.toLowerCase().includes('timeout') ||
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('connection');

        if (isTimeout) {
          // Mostrar mensaje específico para timeout/conexión
          this.notificationService.error(
            'No se logra establecer conexión con el servidor. Por favor, verifique su conexión a internet e intente nuevamente.',
            'Error de conexión'
          );
        } else if (status === 412) {
          // Si es error 412 (PRECONDITION_FAILED), mostrar el mensaje del backend
          // Extraer el mensaje legible (readableMsg tiene prioridad)
          // Intentar múltiples campos posibles donde puede venir el mensaje
          const backendErrorMessage = errorResponse?.readableMsg ||
            errorResponse?.message ||
            errorResponse?.error ||
            (typeof errorResponse === 'string' ? errorResponse : null) ||
            'Error de validación';

          // Extraer detalles adicionales si existen
          const errorDetails = errorResponse?.details ||
            errorResponse?.detail ||
            errorResponse?.errorDetails;

          // Mostrar notificación con el mensaje del backend
          this.notificationService.showPreconditionFailed(backendErrorMessage, errorDetails);
        } else {
          // Para otros errores, mostrar mensaje genérico
          const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
          this.notificationService.error(genericMessage);
        }
      }
    });
  }
}


