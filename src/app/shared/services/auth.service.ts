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

interface DecodedToken {
  sub: string; // email
  roles?: string[]; // ✅ Mantener como opcional
  exp: number;
  iat?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {
    this.validateAndCleanToken();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('🔐 Intentando login con:', credentials.email);
    console.log('🌐 URL del login:', `${this.apiUrl}/auth/login`);

    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
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

          if (!loginResponse.token) {
            console.error('❌ Token no encontrado en la respuesta');
            throw new Error('Token no encontrado en la respuesta');
          }

          if (this.isValidJwtFormat(loginResponse.token)) {
            localStorage.setItem('token', loginResponse.token);
            console.log('💾 Token guardado correctamente');

            // ✅ AGREGAR: Debug del token inmediatamente después de guardar
            this.debugTokenInfo();
          } else {
            console.error('❌ Token recibido tiene formato inválido');
            throw new Error('Token recibido tiene formato inválido');
          }
        })
      );
  }

  // ✅ NUEVO MÉTODO: Debug completo del token
  debugTokenInfo(): void {
    const token = this.getToken();
    if (!token) {
      console.log('🔍 DEBUG: No hay token');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 DEBUG TOKEN PAYLOAD COMPLETO:', payload);
      console.log('🔍 DEBUG - Email (sub):', payload.sub);
      console.log('🔍 DEBUG - Roles raw:', payload.roles);
      console.log('🔍 DEBUG - Tipo de roles:', typeof payload.roles);
      console.log('🔍 DEBUG - Es array?:', Array.isArray(payload.roles));

      const userInfo = this.getUserInfo();
      console.log('🔍 DEBUG - getUserInfo():', userInfo);
      console.log('🔍 DEBUG - getUserRole():', this.getUserRole());
      console.log('🔍 DEBUG - isTeacher():', this.isTeacher());
      console.log('🔍 DEBUG - isAdmin():', this.isAdmin());
      console.log('🔍 DEBUG - canDelete():', this.canDelete());
    } catch (error) {
      console.error('🔍 DEBUG - Error decodificando token:', error);
    }
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

  get token(): string | null {
    return this.getToken();
  }

  getUserInfo(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // ✅ CORREGIDO: Manejo más robusto de roles con verificación de undefined
      let roles: string[] = [];

      // ✅ Verificación explícita para evitar el error undefined
      if (payload.roles !== undefined && payload.roles !== null) {
        if (Array.isArray(payload.roles)) {
          roles = payload.roles;
        } else if (typeof payload.roles === 'string') {
          // Si es string, podría estar separado por comas
          roles = payload.roles.split(',').map((r: string) => r.trim());
        } else {
          console.warn('🔍 Formato de roles no reconocido:', payload.roles);
        }
      }

      // También buscar en otras posibles ubicaciones
      if (payload.authorities && Array.isArray(payload.authorities)) {
        roles = [...roles, ...payload.authorities];
      }

      if (payload.role && typeof payload.role === 'string') {
        roles.push(payload.role);
      }
      return {
        sub: payload.sub || '',
        roles: roles, // ✅ Siempre será un array, nunca undefined
        exp: payload.exp || 0,
        iat: payload.iat || 0
      };
    } catch (error) {
      console.error('❌ Error al decodificar token:', error);
      return null;
    }
  }

  /**
   * Obtiene el rol del usuario - VERSIÓN MEJORADA
   */
  getUserRole(): 'COORDINATOR' | 'ASSISTANT' | 'TEACHER' | null {
    const userInfo = this.getUserInfo();

    // ✅ CORREGIDO: Verificación completa para evitar undefined
    if (!userInfo) {
      console.log('🔍 DEBUG - No hay userInfo');
      return null;
    }

    // ✅ CORREGIDO: Verificar que roles existe y es array
    if (!userInfo.roles || !Array.isArray(userInfo.roles)) {
      console.log('🔍 DEBUG - No hay roles o no es array:', userInfo.roles);
      return null;
    }

    console.log('🔍 DEBUG - Analizando roles:', userInfo.roles);

    // Buscar roles con diferentes formatos posibles
    const roleVariants = {
      COORDINATOR: ['COORDINATOR', 'ROLE_COORDINATOR', 'coordinador', 'COORDINADOR'],
      ASSISTANT: ['ASSISTANT', 'ROLE_ASSISTANT', 'asistente', 'ASISTENTE', 'administrador', 'ADMINISTRADOR'],
      TEACHER: ['TEACHER', 'ROLE_TEACHER', 'docente', 'DOCENTE', 'profesor', 'PROFESOR']
    };

    // Verificar COORDINATOR (mayor jerarquía)
    if (roleVariants.COORDINATOR.some(variant => userInfo.roles!.includes(variant))) {
      console.log('🔍 DEBUG - Rol detectado: COORDINATOR');
      return 'COORDINATOR';
    }

    // Verificar ASSISTANT
    if (roleVariants.ASSISTANT.some(variant => userInfo.roles!.includes(variant))) {
      console.log('🔍 DEBUG - Rol detectado: ASSISTANT');
      return 'ASSISTANT';
    }

    // Verificar TEACHER
    if (roleVariants.TEACHER.some(variant => userInfo.roles!.includes(variant))) {
      console.log('🔍 DEBUG - Rol detectado: TEACHER');
      return 'TEACHER';
    }

    console.log('🔍 DEBUG - No se pudo determinar el rol, asignando TEACHER por defecto');
    return 'TEACHER';
  }

  /**
   * Obtiene el nombre para mostrar del usuario
   */
  getUserDisplayName(): string {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.sub) return 'Usuario';

    const localPart = userInfo.sub.split('@')[0];
    const nameParts = localPart.split('.');

    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Obtiene el nombre del rol para mostrar
   */
  getRoleDisplayName(): string {
    const role = this.getUserRole();

    const roleNames: { [key: string]: string } = {
      COORDINATOR: 'Coordinador General',
      ASSISTANT: 'Administrador',
      TEACHER: 'Docente'
    };

    return roleNames[role || 'TEACHER'] || 'Usuario';
  }

  /**
   * Verifica si el usuario es docente
   */
  isTeacher(): boolean {
    const role = this.getUserRole();
    const result = role === 'TEACHER';
    console.log('🔍 DEBUG - isTeacher():', result, 'rol actual:', role);
    return result;
  }

  /**
   * Verifica si el usuario es administrador
   */
  isAdmin(): boolean {
    const role = this.getUserRole();
    const result = role === 'COORDINATOR' || role === 'ASSISTANT';
    console.log('🔍 DEBUG - isAdmin():', result, 'rol actual:', role);
    return result;
  }

  /**
   * Verifica si el usuario puede eliminar registros
   */
  canDelete(): boolean {
    const role = this.getUserRole();
    const result = role === 'COORDINATOR';
    console.log('🔍 DEBUG - canDelete():', result, 'rol actual:', role);
    return result;
  }

  /**
   * Obtiene el tiempo restante del token en minutos
   */
  getTokenTimeRemaining(): number {
    const userInfo = this.getUserInfo();
    if (!userInfo) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = userInfo.exp - currentTime;

    return Math.max(0, Math.floor(timeRemaining / 60));
  }

  /**
   * Verifica si el token está próximo a expirar
   */
  isTokenExpiringSoon(): boolean {
    const timeRemaining = this.getTokenTimeRemaining();
    return timeRemaining > 0 && timeRemaining <= 15;
  }

  /**
   * Obtiene el email del usuario actual
   */
  getUserEmail(): string {
    const userInfo = this.getUserInfo();
    return userInfo?.sub || '';
  }

  /**
   * Obtiene todos los roles del usuario
   */
  getUserRoles(): string[] {
    const userInfo = this.getUserInfo();
    // ✅ CORREGIDO: Asegurar que siempre retorne un array
    return userInfo?.roles || [];
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const roles = this.getUserRoles(); // ✅ Ya retorna [] si no hay roles
    const roleVariants = [role, `ROLE_${role}`, role.toLowerCase(), role.toUpperCase()];
    return roleVariants.some(variant => roles.includes(variant));
  }

  // === MÉTODOS PRIVADOS ===

  private isValidJwtFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  private validateAndCleanToken(): void {
    const token = localStorage.getItem('token');
    if (token && !this.isValidJwtFormat(token)) {
      console.log('🧹 Limpiando token inválido del localStorage');
      localStorage.removeItem('token');
    }
  }
}
