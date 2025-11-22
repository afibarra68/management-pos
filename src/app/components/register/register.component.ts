import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      secondName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      secondLastName: [''],
      numberIdentity: ['', [Validators.required, Validators.minLength(5)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      phoneNumber: ['']
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userData = {
        firstName: this.registerForm.value.firstName,
        secondName: this.registerForm.value.secondName,
        lastName: this.registerForm.value.lastName,
        secondLastName: this.registerForm.value.secondLastName || '',
        numberIdentity: this.registerForm.value.numberIdentity,
        password: this.registerForm.value.password,
        phoneNumber: this.registerForm.value.phoneNumber || ''
      };

      this.authService.createUser(userData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = `Usuario creado exitosamente. Bienvenido ${response.firstName}!`;
          
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 400 || error.status === 409) {
            this.errorMessage = error.error?.message || 'El usuario ya existe o los datos son inválidos';
          } else if (error.status === 0) {
            this.errorMessage = 'Error al conectar con el servidor. Verifica que el backend esté corriendo.';
          } else {
            this.errorMessage = error.error?.message || 'Error al crear el usuario';
          }
          console.error('Register error:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}

