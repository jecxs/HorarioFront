// src/app/shared/services/me.service.ts
import { Injectable } from '@angular/core';
import {map, Observable} from 'rxjs';
import { BaseApiService, ApiResponse } from './base-api.service';
import { TeacherWithAvailabilitiesResponse } from '../../features/teachers/models/docente.model';
import { TeacherAvailabilityResponse, TeacherAvailabilityRequest } from '../../features/teachers/models/disponibilidad.model';

export interface UserProfile {
  uuid: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  firstLogin: boolean;
  teacher?: TeacherWithAvailabilitiesResponse;
}

@Injectable({
  providedIn: 'root'
})
export class MeService extends BaseApiService {

  private readonly BASE_PATH = '/protected/me';

  /**
   * Obtiene el perfil completo del usuario autenticado actual
   */
  getCurrentUserProfile(): Observable<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(`${this.BASE_PATH}/profile`);
  }

  /**
   * Obtiene solo la información de teacher del usuario autenticado (si es docente)
   */
  getCurrentTeacherInfo(): Observable<ApiResponse<TeacherWithAvailabilitiesResponse>> {
    return this.get<TeacherWithAvailabilitiesResponse>(`${this.BASE_PATH}/teacher`);
  }

  /**
   * Obtiene las disponibilidades del docente autenticado actual
   */
  getCurrentTeacherAvailabilities(): Observable<ApiResponse<TeacherAvailabilityResponse[]>> {
    return this.get<TeacherAvailabilityResponse[]>(`${this.BASE_PATH}/availabilities`);
  }

  /**
   * Crea una nueva disponibilidad para el docente autenticado
   */
  createCurrentTeacherAvailability(availability: TeacherAvailabilityRequest): Observable<ApiResponse<TeacherAvailabilityResponse>> {
    return this.post<TeacherAvailabilityResponse>(`${this.BASE_PATH}/availabilities`, availability);
  }

  /**
   * Elimina todas las disponibilidades del docente autenticado
   */
  deleteAllCurrentTeacherAvailabilities(): Observable<ApiResponse<void>> {
    return this.delete<void>(`${this.BASE_PATH}/availabilities`);
  }

  /**
   * Verifica si el usuario actual es un docente
   */
  isCurrentUserTeacher(): Observable<boolean> {
    return this.getCurrentUserProfile().pipe(
      map(response => response.data.role === 'TEACHER' && !!response.data.teacher)
    );
  }
}
