// src/app/features/schedule-assignment/services/class-session.service.ts
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  ClassSessionResponse,
  ClassSessionRequest,
  ClassSessionFilter,
  IntelliSenseResponse,
  ValidationResult,
  ClassSessionValidation,
  DayOfWeek,
  AssignmentState,
  TeacherResponse,
  LearningSpaceResponse,
  TeachingHourResponse, TeacherEligibilityResponse
} from '../models/class-session.model';

@Injectable({
  providedIn: 'root'
})
export class ClassSessionService extends BaseApiService {

  // Estado de la asignación actual
  private assignmentStateSubject = new BehaviorSubject<AssignmentState>({
    mode: 'BY_GROUP'
  });
  public assignmentState$ = this.assignmentStateSubject.asObservable();

  // Cache de sesiones cargadas
  private sessionsCache = new Map<string, ClassSessionResponse[]>();

  // Sesiones actuales en memoria
  private currentSessionsSubject = new BehaviorSubject<ClassSessionResponse[]>([]);
  public currentSessions$ = this.currentSessionsSubject.asObservable();

  // === MÉTODOS PRINCIPALES ===

  // Obtener todas las sesiones
  getAllSessions(): Observable<ApiResponse<ClassSessionResponse[]>> {
    return this.get<ClassSessionResponse[]>('/protected/class-sessions');
  }

  // Obtener sesión por ID
  getSessionById(uuid: string): Observable<ApiResponse<ClassSessionResponse>> {
    return this.get<ClassSessionResponse>(`/protected/class-sessions/${uuid}`);
  }

  // Obtener sesiones por grupo
  getSessionsByGroup(groupUuid: string): Observable<ApiResponse<ClassSessionResponse[]>> {
    return this.get<ClassSessionResponse[]>(`/protected/class-sessions/student-group/${groupUuid}`)
      .pipe(
        tap(response => {
          if (response.data) {
            this.sessionsCache.set(`group-${groupUuid}`, response.data);
            this.currentSessionsSubject.next(response.data);
          }
        })
      );
  }

  // Obtener sesiones por docente
  getSessionsByTeacher(teacherUuid: string): Observable<ApiResponse<ClassSessionResponse[]>> {
    return this.get<ClassSessionResponse[]>(`/protected/class-sessions/teacher/${teacherUuid}`)
      .pipe(
        tap(response => {
          if (response.data) {
            this.sessionsCache.set(`teacher-${teacherUuid}`, response.data);
            this.currentSessionsSubject.next(response.data);
          }
        })
      );
  }

  // Obtener IntelliSense
  getIntelliSense(params: {
    courseUuid?: string;
    groupUuid?: string;
    dayOfWeek?: string;
    timeSlotUuid?: string;
  }): Observable<ApiResponse<IntelliSenseResponse>> {
    const httpParams = this.createParams(params);
    return this.get<IntelliSenseResponse>('/protected/class-sessions/intellisense', httpParams);
  }

  // Validar asignación en tiempo real
  validateAssignment(validation: ClassSessionValidation): Observable<ValidationResult> {
    // Construir la URL con sessionUuid como parámetro si existe
    let url = '/protected/class-sessions/validate';
    if (validation.sessionUuid) {
      url += `?excludeSessionUuid=${validation.sessionUuid}`;
    }

    return this.http.post<ValidationResult>(`${this.buildUrl(url)}`, validation);
  }

  // Verificar conflictos
  checkConflicts(request: ClassSessionRequest): Observable<ValidationResult> {
    // Nota: Este endpoint devuelve ValidationResult directamente, no wrapped en ApiResponse
    return this.http.post<ValidationResult>(`${this.buildUrl('/protected/class-sessions/check-conflicts')}`, request);
  }

  // Crear sesión
  createSession(request: ClassSessionRequest): Observable<ApiResponse<ClassSessionResponse>> {
    return this.post<ClassSessionResponse>('/protected/class-sessions', request)
      .pipe(
        tap(response => {
          if (response.data) {
            // Actualizar cache y sesiones actuales
            const currentSessions = this.currentSessionsSubject.getValue();
            this.currentSessionsSubject.next([...currentSessions, response.data]);
          }
        })
      );
  }

  // Actualizar sesión
  updateSession(uuid: string, request: ClassSessionRequest): Observable<ApiResponse<ClassSessionResponse>> {
    return this.put<ClassSessionResponse>(`/protected/class-sessions/${uuid}`, request)
      .pipe(
        tap(response => {
          if (response.data) {
            // Actualizar en las sesiones actuales
            const currentSessions = this.currentSessionsSubject.getValue();
            const index = currentSessions.findIndex(s => s.uuid === uuid);
            if (index !== -1) {
              currentSessions[index] = response.data;
              this.currentSessionsSubject.next([...currentSessions]);
            }
          }
        })
      );
  }

  // Eliminar sesión
  deleteSession(uuid: string): Observable<ApiResponse<void>> {
    return this.delete<void>(`/protected/class-sessions/${uuid}`)
      .pipe(
        tap(() => {
          // Remover de las sesiones actuales
          const currentSessions = this.currentSessionsSubject.getValue();
          this.currentSessionsSubject.next(
            currentSessions.filter(s => s.uuid !== uuid)
          );
        })
      );
  }

  // Filtrar sesiones
  filterSessions(filter: ClassSessionFilter): Observable<ApiResponse<ClassSessionResponse[]>> {
    const params = this.createParams(filter);
    return this.get<ClassSessionResponse[]>('/protected/class-sessions/filter', params);
  }

  // === MÉTODOS AUXILIARES PARA OBTENER DATOS RELACIONADOS ===

  // class-session.service.ts
  getEligibleTeachersDetailed(courseUuid: string, dayOfWeek?: string, timeSlotUuid?: string):
    Observable<ApiResponse<TeacherEligibilityResponse[]>> {
    const params = this.createParams({ dayOfWeek, timeSlotUuid });
    return this.get<TeacherEligibilityResponse[]>(`/protected/teachers/eligible-detailed/${courseUuid}`, params);
  }

  getEligibleSpaces(
    courseUuid: string,
    dayOfWeek?: string,
    timeSlotUuid?: string,
    teachingHourUuids?: string[]  // ✅ NUEVO PARÁMETRO
  ): Observable<ApiResponse<LearningSpaceResponse[]>> {

    const params = this.createParams({
      dayOfWeek,
      timeSlotUuid,
      // ✅ Enviar como string separado por comas
      teachingHourUuids: teachingHourUuids?.length ? teachingHourUuids.join(',') : undefined
    });

    return this.get<LearningSpaceResponse[]>(`/protected/learning-space/eligible/${courseUuid}`, params);
  }


  // Obtener horas disponibles
  getAvailableHours(teacherUuid: string, spaceUuid: string, groupUuid: string, dayOfWeek: string):
    Observable<ApiResponse<TeachingHourResponse[]>> {
    const params = this.createParams({ teacherUuid, spaceUuid, groupUuid, dayOfWeek });
    return this.get<TeachingHourResponse[]>('/protected/timeslots/available', params);
  }

  // === MÉTODOS DE GESTIÓN DE ESTADO ===

  // Actualizar estado de asignación
  updateAssignmentState(state: Partial<AssignmentState>): void {
    const currentState = this.assignmentStateSubject.getValue();
    this.assignmentStateSubject.next({ ...currentState, ...state });
  }

  // Limpiar cache
  clearCache(): void {
    this.sessionsCache.clear();
    this.currentSessionsSubject.next([]);
  }

  // Obtener sesiones desde cache
  getCachedSessions(key: string): ClassSessionResponse[] | undefined {
    return this.sessionsCache.get(key);
  }

  // === HELPERS PARA VERIFICACIÓN LOCAL ===

  // Helpers para verificar conflictos localmente (antes de enviar al servidor)
  checkLocalConflicts(
    sessions: ClassSessionResponse[],
    dayOfWeek: DayOfWeek,
    teachingHourUuids: string[],
    teacherUuid?: string,
    spaceUuid?: string,
    groupUuid?: string
  ): string[] {
    const conflicts: string[] = [];

    sessions.forEach(session => {
      if (session.dayOfWeek !== dayOfWeek) return;

      const hasTimeConflict = session.teachingHours.some(hour =>
        teachingHourUuids.includes(hour.uuid)
      );

      if (!hasTimeConflict) return;

      if (teacherUuid && session.teacher.uuid === teacherUuid) {
        conflicts.push(`Docente ${session.teacher.fullName} ya tiene clase en este horario`);
      }

      if (spaceUuid && session.learningSpace.uuid === spaceUuid) {
        conflicts.push(`Aula ${session.learningSpace.name} ya está ocupada`);
      }

      if (groupUuid && session.studentGroup.uuid === groupUuid) {
        conflicts.push(`Grupo ${session.studentGroup.name} ya tiene clase en este horario`);
      }
    });

    return conflicts;
  }

  // === UTILIDADES ADICIONALES ===

  /**
   * Obtiene estadísticas de las sesiones actuales
   */
  getSessionStats(): {
    totalSessions: number;
    totalHours: number;
    sessionsByDay: { [key in DayOfWeek]?: number };
    sessionsByTeacher: Map<string, number>;
  } {
    const sessions = this.currentSessionsSubject.getValue();
    const sessionsByDay: { [key in DayOfWeek]?: number } = {};
    const sessionsByTeacher = new Map<string, number>();

    sessions.forEach(session => {
      // Contar por día
      sessionsByDay[session.dayOfWeek] = (sessionsByDay[session.dayOfWeek] || 0) + 1;

      // Contar por docente
      const teacherKey = `${session.teacher.fullName} (${session.teacher.uuid})`;
      sessionsByTeacher.set(teacherKey, (sessionsByTeacher.get(teacherKey) || 0) + 1);
    });

    return {
      totalSessions: sessions.length,
      totalHours: sessions.reduce((sum, s) => sum + s.totalHours, 0),
      sessionsByDay,
      sessionsByTeacher
    };
  }

  /**
   * Verifica si una combinación de horas pedagógicas es válida
   */
  validateTeachingHoursCombination(hours: TeachingHourResponse[]): {
    isValid: boolean;
    errors: string[];
  } {
    if (!hours || hours.length === 0) {
      return { isValid: false, errors: ['Debe seleccionar al menos una hora pedagógica'] };
    }

    // Ordenar por orden en el turno
    const sortedHours = [...hours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);

    // Verificar que sean consecutivas
    const errors: string[] = [];
    for (let i = 1; i < sortedHours.length; i++) {
      if (sortedHours[i].orderInTimeSlot !== sortedHours[i-1].orderInTimeSlot + 1) {
        errors.push('Las horas pedagógicas seleccionadas deben ser consecutivas');
        break;
      }
    }

    // Verificar duración máxima (ejemplo: no más de 4 horas seguidas)
    const totalMinutes = hours.reduce((sum, h) => sum + h.durationMinutes, 0);
    if (totalMinutes > 240) { // 4 horas
      errors.push('No se pueden asignar más de 4 horas consecutivas');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene sugerencias de asignación basadas en el contexto
   */
  getSuggestions(context: {
    groupUuid?: string;
    courseUuid?: string;
    dayOfWeek?: DayOfWeek;
  }): string[] {
    const suggestions: string[] = [];

    if (context.courseUuid) {
      // Sugerencias basadas en el curso
      suggestions.push('Verifique que el docente tenga el área de conocimiento requerida');
      suggestions.push('Considere asignar aulas del tipo requerido por el curso');
    }

    if (context.dayOfWeek === DayOfWeek.MONDAY || context.dayOfWeek === DayOfWeek.FRIDAY) {
      suggestions.push('Los lunes y viernes suelen tener mayor ausentismo');
    }

    if (context.groupUuid) {
      suggestions.push('Intente distribuir las materias de manera equilibrada durante la semana');
      suggestions.push('Evite dejar huecos largos en el horario del grupo');
    }

    return suggestions;
  }
}
