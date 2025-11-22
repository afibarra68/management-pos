import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor() {
    this.loginForm = this.fb.group({
      numberIdentity: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      // Mapear los campos del formulario a la estructura que espera el backend
      const credentials = {
        username: this.loginForm.value.numberIdentity,
        accesKey: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.jwt) {
            // Login exitoso, redirigir al dashboard
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Error al iniciar sesión: No se recibió el token';
          }
        },
        error: (error) => {
          this.isLoading = false;
          // Manejar diferentes tipos de errores del backend
          if (error.status === 401 || error.status === 403) {
            this.errorMessage = 'Credenciales incorrectas';
          } else if (error.status === 404) {
            this.errorMessage = 'Usuario no encontrado';
          } else if (error.status === 0) {
            this.errorMessage = 'Error al conectar con el servidor. Verifica que el backend esté corriendo.';
          } else {
            this.errorMessage = error.error?.message || error.message || 'Error al iniciar sesión';
          }
          console.error('Login error:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}

