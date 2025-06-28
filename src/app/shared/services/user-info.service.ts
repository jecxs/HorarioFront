// src/app/shared/services/user-info.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { BaseApiService } from './base-api.service';

export interface UserInfo {
  uuid: string;
  email: string;
  fullName: string;
  role: 'COORDINATOR' | 'ASSISTANT' | 'TEACHER';
  roleDisplayName: string;
  active: boolean;
  firstLogin: boolean;
  teacher?: {
    uuid: string;
    department: string;
    knowledgeAreas: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserInfoService extends BaseApiService {
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private authService: AuthService,
    http: HttpClient
  ) {
    super(http);
  }

  /**
   * Carga la información del usuario actual desde el token JWT
   */
  loadCurrentUserInfo(): Observable<UserInfo> {
    const tokenInfo = this.authService.getUserInfo();

    if (!tokenInfo) {
      throw new Error('No hay información de usuario en el token');
    }

    const currentUser = this.currentUserSubject.getValue();
    if (currentUser && currentUser.email === tokenInfo.sub) {
      return new Observable(observer => {
        observer.next(currentUser);
        observer.complete();
      });
    }

    return this.getUserProfile();
  }

  /**
   * Obtiene el perfil completo del usuario desde el servidor
   */
  private getUserProfile(): Observable<UserInfo> {
    return new Observable(observer => {
      const tokenInfo = this.authService.getUserInfo();

      if (tokenInfo) {
        // ✅ USAR DIRECTAMENTE EL ROL DEL AUTH SERVICE
        const role = this.authService.getUserRole() || 'TEACHER';

        console.log('🔍 UserInfoService - Role del AuthService:', role);

        const userInfo: UserInfo = {
          uuid: 'temp-uuid',
          email: tokenInfo.sub,
          fullName: this.extractNameFromEmail(tokenInfo.sub),
          role: role, // ✅ Usar el rol ya determinado por AuthService
          roleDisplayName: this.authService.getRoleDisplayName(),
          active: true,
          firstLogin: false
        };

        console.log('🔍 UserInfoService - UserInfo creado:', userInfo);

        this.currentUserSubject.next(userInfo);
        observer.next(userInfo);
        observer.complete();
      } else {
        observer.error('No se pudo obtener información del usuario');
      }
    });
  }

  /**
   * Obtiene el usuario actual de forma síncrona
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.getValue();
  }

  /**
   * Actualiza la información del usuario
   */
  updateUserInfo(userInfo: UserInfo): void {
    this.currentUserSubject.next(userInfo);
  }

  /**
   * Limpia la información del usuario
   */
  clearUserInfo(): void {
    this.currentUserSubject.next(null);
  }

  /**
   * Obtiene el nombre para mostrar basado en el rol
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    if (!user) {
      return this.authService.getUserDisplayName(); // ✅ Fallback al AuthService
    }

    return user.fullName || this.extractNameFromEmail(user.email);
  }

  /**
   * Obtiene el rol para mostrar
   */
  getUserRoleDisplay(): string {
    const user = this.getCurrentUser();
    if (!user) {
      return this.authService.getRoleDisplayName(); // ✅ Fallback al AuthService
    }

    return user.roleDisplayName;
  }

  /**
   * Verifica si el usuario actual es docente
   */
  isTeacher(): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      return this.authService.isTeacher(); // ✅ Fallback al AuthService
    }

    const result = user.role === 'TEACHER';
    console.log('🔍 UserInfoService - isTeacher():', result, 'user role:', user.role);
    return result;
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      return this.authService.isAdmin(); // ✅ Fallback al AuthService
    }

    const result = user.role === 'COORDINATOR' || user.role === 'ASSISTANT';
    console.log('🔍 UserInfoService - isAdmin():', result, 'user role:', user.role);
    return result;
  }

  /**
   * Verifica si el usuario puede eliminar registros
   */
  canDelete(): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      return this.authService.canDelete(); // ✅ Fallback al AuthService
    }

    const result = user.role === 'COORDINATOR';
    console.log('🔍 UserInfoService - canDelete():', result, 'user role:', user.role);
    return result;
  }

  // === MÉTODOS PRIVADOS ===

  private extractNameFromEmail(email: string): string {
    if (!email) return 'Usuario';

    const localPart = email.split('@')[0];
    const nameParts = localPart.split('.');

    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Inicializa la información del usuario al cargar la aplicación
   */
  initializeUserInfo(): void {
    if (this.authService.isAuthenticated()) {
      console.log('🔍 UserInfoService - Inicializando información de usuario...');
      this.authService.debugTokenInfo(); // ✅ Debug del token

      this.loadCurrentUserInfo().subscribe({
        next: (userInfo) => {
          console.log('✅ UserInfoService - Información de usuario cargada:', userInfo);
        },
        error: (error) => {
          console.error('❌ UserInfoService - Error al cargar información de usuario:', error);
        }
      });
    }
  }
}
