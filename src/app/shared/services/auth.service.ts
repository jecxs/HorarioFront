// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  message?: string;
  data: T;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {
    // Limpiar cualquier token inválido al inicializar el servicio
    this.validateAndCleanToken();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('🔐 Intentando login con:', credentials.email);
    console.log('🌐 URL del login:', `${this.apiUrl}/auth/login`);

    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        // Extraer el objeto data que contiene el token
        map(response => {
          console.log('🔄 Respuesta recibida del servidor:', response);

          if (!response || !response.data) {
            console.error('❌ Respuesta del servidor no tiene el formato esperado');
            throw new Error('Respuesta del servidor no tiene el formato esperado');
          }

          return response.data;
        }),
        tap(loginResponse => {
          console.log('✅ Objeto LoginResponse extraído:', loginResponse);

          // Validar que el token exista y tenga el formato correcto
          if (!loginResponse.token) {
            console.error('❌ Token no encontrado en la respuesta');
            throw new Error('Token no encontrado en la respuesta');
          }

          if (this.isValidJwtFormat(loginResponse.token)) {
            localStorage.setItem('token', loginResponse.token);
            console.log('💾 Token guardado correctamente');
          } else {
            console.error('❌ Token recibido tiene formato inválido');
            throw new Error('Token recibido tiene formato inválido');
          }
        })
      );
  }

  logout(): void {
    console.log('🚪 Cerrando sesión');
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No hay token guardado');
      return false;
    }

    if (!this.isValidJwtFormat(token)) {
      console.log('❌ Token tiene formato inválido, eliminando...');
      localStorage.removeItem('token');
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > currentTime;

      if (!isValid) {
        console.log('❌ Token expirado, eliminando...');
        localStorage.removeItem('token');
      } else {
        console.log('✅ Token válido y no expirado');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error al validar token:', error);
      localStorage.removeItem('token');
      return false;
    }
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (token && !this.isValidJwtFormat(token)) {
      console.log('❌ Token inválido encontrado, eliminando...');
      localStorage.removeItem('token');
      return null;
    }
    return token;
  }

  // Propiedad getter para compatibilidad con el interceptor
  get token(): string | null {
    return this.getToken();
  }

  getUserInfo(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        email: payload.sub,
        roles: payload.roles || [],
        exp: payload.exp
      };
    } catch {
      return null;
    }
  }

  // Método privado para validar formato JWT
  private isValidJwtFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Un JWT válido debe tener exactamente 2 puntos (3 partes separadas por puntos)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Método para limpiar tokens inválidos al inicializar
  private validateAndCleanToken(): void {
    const token = localStorage.getItem('token');
    if (token && !this.isValidJwtFormat(token)) {
      console.log('🧹 Limpiando token inválido del localStorage');
      localStorage.removeItem('token');
    }
  }
}
