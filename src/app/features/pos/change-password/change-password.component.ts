import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, ChangePasswordRequest } from '../../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    MessageModule
  ],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  form: FormGroup;
  loading = false;
  success = false;
  username: string = '';
  mustChange: boolean = false; // Indica si el cambio es obligatorio (viene del login)

  passwordRequirements = 'La contraseña debe tener al menos 8 caracteres, incluyendo al menos 1 mayúscula, 1 minúscula, 1 dígito y 1 carácter especial';

  constructor() {
    this.form = this.fb.group({
      username: ['', Validators.required],
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Verificar si viene del login con mustChangePassword
    this.route.queryParams.subscribe(params => {
      this.mustChange = params['mustChange'] === 'true' || this.auth.mustChangePassword();
    });

    // Obtener username del usuario autenticado
    const userData = this.auth.getUserData();
    if (userData?.numberIdentity) {
      this.username = userData.numberIdentity;
      this.form.patchValue({ username: userData.numberIdentity });
    }
  }

  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  submit(): void {
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.success = false;

    const formValue = this.form.value;
    const request: ChangePasswordRequest = {
      username: formValue.username,
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword
    };

    this.auth.changePassword(request).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.notificationService.success('Contraseña cambiada exitosamente. Serás redirigido al login...');

        // Limpiar completamente localStorage después del cambio exitoso
        // Limpiar manualmente para asegurar que se elimine todo
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        // También llamar a logout para limpiar cualquier estado adicional
        this.auth.logout();

        // Redirigir al login después de 2 segundos para que vea el mensaje de éxito
        setTimeout(() => {
          this.router.navigate(['/auth/login'], {
            queryParams: { passwordChanged: 'true' },
            replaceUrl: true
          });
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        // El interceptor ya muestra la notificación, no necesitamos mostrar error inline
      }
    });
  }

  cancel(): void {
    // Si el cambio es obligatorio, no permitir cancelar
    if (this.mustChange) {
      return;
    }
    this.router.navigate([environment.defaultPosPath]);
  }
}
