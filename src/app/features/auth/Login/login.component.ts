import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

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
    MessageModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      accesKey: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    const credentials: LoginRequest = this.form.value;
    this.auth.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        // Pequeño delay antes de navegar para evitar que el sidebar aparezca brevemente
        setTimeout(() => {
          this.router.navigate(['/pos']);
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error en el login';
      }
    });
  }
}


