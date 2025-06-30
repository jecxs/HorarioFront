// src/app/features/docentes/services/disponibilidad.service.ts
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  TeacherAvailabilityResponse,
  TeacherAvailabilityRequest,
  DayOfWeek
} from '../models/disponibilidad.model';

interface ExtendedAvailabilityRequest extends TeacherAvailabilityRequest {
  replaceExisting?: boolean;
  overlappingUuids?: string[];

}

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService extends BaseApiService {

  // CORREGIDO: Removí '/protected' del inicio ya que BaseApiService ya incluye '/api'
  private readonly BASE_PATH = '/protected/teachers';

  /**
   * Obtiene todas las disponibilidades de un docente
   */
  getTeacherAvailabilities(teacherUuid: string): Observable<ApiResponse<TeacherAvailabilityResponse[]>> {
    return this.get<TeacherAvailabilityResponse[]>(`${this.BASE_PATH}/${teacherUuid}/availabilities`);
  }

  /**
   * Obtiene las disponibilidades de un docente para un día específico
   */
  getTeacherAvailabilitiesByDay(
    teacherUuid: string,
    dayOfWeek: DayOfWeek
  ): Observable<ApiResponse<TeacherAvailabilityResponse[]>> {
    return this.get<TeacherAvailabilityResponse[]>(
      `${this.BASE_PATH}/${teacherUuid}/availabilities/day/${dayOfWeek}`
    );
  }

  /**
   * Crea una nueva disponibilidad para el docente
   * Maneja automáticamente el reemplazo de disponibilidades solapadas si se especifica
   */
  createAvailability(
    teacherUuid: string,
    availability: ExtendedAvailabilityRequest,
    usePersonalEndpoint: boolean = false // ✅ AGREGAR este parámetro
  ): Observable<ApiResponse<TeacherAvailabilityResponse>> {

    // Si necesitamos reemplazar disponibilidades existentes
    if (availability.replaceExisting && availability.overlappingUuids?.length) {
      return this.replaceOverlappingAvailabilities(teacherUuid, availability, usePersonalEndpoint);
    }

    // Determinar el endpoint a usar
    const endpoint = usePersonalEndpoint
      ? '/protected/me/availabilities'
      : `${this.BASE_PATH}/${teacherUuid}/availabilities`;

    // Crear disponibilidad normal
    return this.post<TeacherAvailabilityResponse>(
      endpoint,
      {
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime,
        endTime: availability.endTime
      }
    );
  }

  /**
   * Actualiza una disponibilidad existente
   */
  updateAvailability(
    availabilityUuid: string,
    availability: TeacherAvailabilityRequest
  ): Observable<ApiResponse<TeacherAvailabilityResponse>> {
    // CORREGIDO: La URL para actualizar disponibilidades específicas
    return this.put<TeacherAvailabilityResponse>(
      `${this.BASE_PATH}/availabilities/${availabilityUuid}`,
      availability
    );
  }

  /**
   * Elimina una disponibilidad específica
   */
  deleteAvailability(availabilityUuid: string): Observable<ApiResponse<void>> {
    // CORREGIDO: La URL para eliminar disponibilidades específicas
    return this.delete<void>(`${this.BASE_PATH}/availabilities/${availabilityUuid}`);
  }

  /**
   * Elimina todas las disponibilidades de un docente
   */
  deleteAllTeacherAvailabilities(teacherUuid: string, usePersonalEndpoint: boolean = false): Observable<ApiResponse<void>> {
    const endpoint = usePersonalEndpoint
      ? '/protected/me/availabilities'
      : `${this.BASE_PATH}/${teacherUuid}/availabilities`;

    return this.delete<void>(endpoint);
  }

  /**
   * Verifica si un docente está disponible en un horario específico
   */
  checkTeacherAvailability(
    teacherUuid: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string
  ): Observable<ApiResponse<boolean>> {
    const params = this.createParams({
      dayOfWeek,
      startTime,
      endTime
    });

    return this.get<boolean>(
      `${this.BASE_PATH}/${teacherUuid}/availabilities/check`,
      params
    );
  }

  /**
   * Método privado para manejar el reemplazo de disponibilidades solapadas
   */

  /**
   * Método privado para manejar el reemplazo de disponibilidades solapadas
   */
  private replaceOverlappingAvailabilities(
    teacherUuid: string,
    availability: TeacherAvailabilityRequest & { overlappingUuids?: string[] },
    usePersonalEndpoint: boolean = false // ✅ AGREGAR este parámetro
  ): Observable<ApiResponse<TeacherAvailabilityResponse>> {

    // Primero eliminar las disponibilidades solapadas
    const deleteOperations = availability.overlappingUuids!.map(uuid =>
      this.deleteAvailability(uuid).pipe(
        catchError(error => {
          console.warn(`Error al eliminar disponibilidad ${uuid}:`, error);
          return of(null); // Continuar con las demás operaciones
        })
      )
    );

    // Determinar el endpoint a usar para crear
    const createEndpoint = usePersonalEndpoint
      ? '/protected/me/availabilities'
      : `${this.BASE_PATH}/${teacherUuid}/availabilities`;

    // Ejecutar todas las eliminaciones y luego crear la nueva
    return forkJoin(deleteOperations).pipe(
      switchMap(() => {
        return this.post<TeacherAvailabilityResponse>(
          createEndpoint,
          {
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime
          }
        );
      })
    );
  }

  /**
   * Operaciones en lote para disponibilidades
   */
  createMultipleAvailabilities(
    teacherUuid: string,
    availabilities: TeacherAvailabilityRequest[]
  ): Observable<ApiResponse<TeacherAvailabilityResponse[]>> {
    const createOperations = availabilities.map(availability =>
      this.createAvailability(teacherUuid, availability).pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error creando disponibilidad:', error);
          return of(null);
        })
      )
    );

    return forkJoin(createOperations).pipe(
      map(results => {
        const successfulCreations = results.filter(result => result !== null) as TeacherAvailabilityResponse[];
        return {
          data: successfulCreations,
          message: `Se crearon ${successfulCreations.length} de ${availabilities.length} disponibilidades`
        };
      })
    );
  }

  /**
   * Copia disponibilidades de un día a otro
   */
  copyAvailabilitiesFromDay(
    teacherUuid: string,
    fromDay: DayOfWeek,
    toDay: DayOfWeek,
    replaceExisting: boolean = false
  ): Observable<ApiResponse<TeacherAvailabilityResponse[]>> {

    return this.getTeacherAvailabilitiesByDay(teacherUuid, fromDay).pipe(
      switchMap(response => {
        const sourceAvailabilities = response.data;

        if (sourceAvailabilities.length === 0) {
          return of({
            data: [],
            message: `No hay disponibilidades en ${fromDay} para copiar`
          });
        }

        // Convertir a requests para el día de destino
        const newAvailabilities: ExtendedAvailabilityRequest[] = sourceAvailabilities.map(availability => ({
          dayOfWeek: toDay,
          startTime: availability.startTime,
          endTime: availability.endTime,
          replaceExisting
        }));

        // Si necesitamos reemplazar, primero obtener las existentes del día destino
        if (replaceExisting) {
          return this.getTeacherAvailabilitiesByDay(teacherUuid, toDay).pipe(
            switchMap(targetResponse => {
              const targetAvailabilities = targetResponse.data;

              // Eliminar disponibilidades existentes del día destino
              if (targetAvailabilities.length > 0) {
                const deleteOps = targetAvailabilities.map(a =>
                  this.deleteAvailability(a.uuid).pipe(
                    catchError(() => of(null))
                  )
                );

                return forkJoin(deleteOps).pipe(
                  switchMap(() => this.createMultipleAvailabilities(teacherUuid, newAvailabilities))
                );
              } else {
                return this.createMultipleAvailabilities(teacherUuid, newAvailabilities);
              }
            })
          );
        } else {
          return this.createMultipleAvailabilities(teacherUuid, newAvailabilities);
        }
      })
    );
  }

  /**
   * Obtiene estadísticas de disponibilidad del docente
   */
  getAvailabilityStats(availabilities: TeacherAvailabilityResponse[]): {
    totalHours: number;
    daysWithAvailability: number;
    averageHoursPerDay: number;
    longestBlock: number;
    shortestBlock: number;
  } {
    if (availabilities.length === 0) {
      return {
        totalHours: 0,
        daysWithAvailability: 0,
        averageHoursPerDay: 0,
        longestBlock: 0,
        shortestBlock: 0
      };
    }

    let totalMinutes = 0;
    let longestBlockMinutes = 0;
    let shortestBlockMinutes = Number.MAX_VALUE;
    const daysSet = new Set<DayOfWeek>();

    availabilities.forEach(availability => {
      const [startHour, startMinute] = availability.startTime.split(':').map(Number);
      const [endHour, endMinute] = availability.endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const blockMinutes = endMinutes - startMinutes;

      totalMinutes += blockMinutes;
      daysSet.add(availability.dayOfWeek);

      longestBlockMinutes = Math.max(longestBlockMinutes, blockMinutes);
      shortestBlockMinutes = Math.min(shortestBlockMinutes, blockMinutes);
    });

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const daysWithAvailability = daysSet.size;
    const averageHoursPerDay = daysWithAvailability > 0 ?
      Math.round((totalHours / daysWithAvailability) * 10) / 10 : 0;

    return {
      totalHours,
      daysWithAvailability,
      averageHoursPerDay,
      longestBlock: Math.round(longestBlockMinutes / 60 * 10) / 10,
      shortestBlock: shortestBlockMinutes === Number.MAX_VALUE ? 0 :
        Math.round(shortestBlockMinutes / 60 * 10) / 10
    };
  }

}
