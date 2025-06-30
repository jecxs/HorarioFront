// src/app/features/auth/login.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import { LoginRequest } from '../../shared/models/auth.models';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  currentPeriod = {
    name: '2026I',
    startDate: '1 mar 2026',
    endDate: '15 jul 2026'
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Limpiar cualquier sesión anterior
    this.auth.logout();

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // Limpiar errores cuando el usuario empiece a escribir
    this.form.valueChanges.subscribe(() => {
      if (this.errorMessage) {
        this.errorMessage = '';
      }
    });
  }

  get f() {
    return this.form.controls as { [key: string]: import('@angular/forms').AbstractControl };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const creds: LoginRequest = this.form.value;
    console.log('🔐 Iniciando proceso de login...');

    this.auth.login(creds).subscribe({
      next: (res) => {
        console.log('✅ Login exitoso, redirigiendo...');
        this.isLoading = false;
        // Pequeño delay para mejorar la UX
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (err) => {
        console.error('❌ Error en login:', err);
        this.isLoading = false;

        // Manejar diferentes tipos de errores con mensajes más amigables
        if (err.status === 403) {
          this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (err.status === 401) {
          this.errorMessage = 'No tienes autorización para acceder al sistema.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté ejecutándose.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Error interno del servidor. Intenta nuevamente.';
        }

        // Agregar clase de animación de error
        this.addErrorAnimation();
      }
    });
  }

  private addErrorAnimation(): void {
    // Agregar una pequeña animación de shake para el error
    const errorElement = document.querySelector('.animate-shake');
    if (errorElement) {
      errorElement.classList.remove('animate-shake');
      setTimeout(() => {
        errorElement.classList.add('animate-shake');
      }, 10);
    }
  }
}
