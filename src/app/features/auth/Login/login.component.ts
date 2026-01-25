import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
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
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  error: string | null = null;
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
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pos';
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
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pos';
        this.router.navigate([returnUrl], { replaceUrl: true });
        return;
      }
      
      document.body.classList.add('login-page');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
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

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    const credentials: LoginRequest = this.form.value;
    
    this.auth.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pos';

        // Mostrar modal "Validando, acceso al turno!" e invocar /shift-validation/active-shift
        this.showValidationModal = true;
        this.shiftService.getOrCreateActiveShift().pipe(
          finalize(() => { this.showValidationModal = false; })
        ).subscribe({
          next: () => {
            this.router.navigateByUrl(returnUrl, { replaceUrl: true });
          },
          error: (err) => {
            const status = err?.status;
            const errorResponse = err?.error;
            if (status === 412) {
              const msg = errorResponse?.message || errorResponse?.error || 'Error al validar acceso al turno';
              this.notificationService.showPreconditionFailed(msg, errorResponse?.details || errorResponse?.detail);
            } else {
              this.notificationService.error(errorResponse?.message || 'No se pudo validar el acceso al turno.');
            }
            this.router.navigateByUrl(returnUrl, { replaceUrl: true });
          }
        });
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        const errorResponse = err?.error;

        // Si es error 412 (PRECONDITION_FAILED), mostrar el mensaje del backend
        if (status === 412) {
          const errorMessage = errorResponse?.message || errorResponse?.error || 'Error de validación';
          const errorDetails = errorResponse?.details || errorResponse?.detail;

          // Mostrar notificación con el mensaje del backend
          this.notificationService.showPreconditionFailed(errorMessage, errorDetails);

          // También mostrar en el formulario para referencia
          this.error = errorMessage;
        } else {
          // Para otros errores, mostrar mensaje genérico
          const genericMessage = 'Ha ocurrido un error. Por favor, consulte al administrador.';
          this.notificationService.error(genericMessage);
          this.error = err?.error?.message || 'Error en el login';
        }
      }
    });
  }
}


