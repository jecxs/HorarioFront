// src/app/features/schedule-assignment/services/teacher-metadata.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeacherScheduleMetadata, TeacherAssignmentStats } from '../models/teacher-metadata.model';
import { ClassSessionResponse, TeacherResponse, DayOfWeek } from '../models/class-session.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherMetadataService {

  private _teacherScheduleMetadata$ = new BehaviorSubject<TeacherScheduleMetadata | null>(null);
  public teacherScheduleMetadata$ = this._teacherScheduleMetadata$.asObservable();

  private metadataCache = new Map<string, TeacherScheduleMetadata>();

  /**
   * Calcula y actualiza los metadatos de horario para un docente específico
   */
  updateTeacherScheduleMetadata(
    teacher: TeacherResponse,
    sessions: ClassSessionResponse[]
  ): void {
    console.log('=== CALCULATING TEACHER METADATA ===');
    console.log('Teacher:', teacher.fullName);
    console.log('Sessions:', sessions.length);

    // Agrupar sesiones por día
    const sessionsByDay: { [day: string]: ClassSessionResponse[] } = {};
    Object.values(DayOfWeek).forEach(day => {
      sessionsByDay[day] = sessions.filter(session => session.dayOfWeek === day);
    });

    // Calcular estadísticas
    const totalAssignedHours = sessions.reduce((sum, session) => sum + session.totalHours, 0);
    const totalSessions = sessions.length;

    // Estimación de horas disponibles (esto podría mejorar con datos reales de disponibilidad)
    const availabilityHours = this.estimateWeeklyAvailability(teacher);
    const utilizationRate = availabilityHours > 0 ? (totalAssignedHours / availabilityHours) * 100 : 0;
    const workloadPercentage = Math.min(utilizationRate, 100);

    const metadata: TeacherScheduleMetadata = {
      teacher,
      totalAssignedHours,
      totalSessions,
      sessionsByDay,
      workloadPercentage,
      availabilityHours,
      utilizationRate,
      lastUpdated: new Date()
    };

    console.log('Teacher metadata calculated:', metadata);

    // Actualizar cache y estado
    this.metadataCache.set(teacher.uuid, metadata);
    this._teacherScheduleMetadata$.next(metadata);
  }

  /**
   * Obtiene estadísticas de asignación del docente
   */
  getTeacherAssignmentStats(): Observable<TeacherAssignmentStats | null> {
    return this.teacherScheduleMetadata$.pipe(
      map(metadata => {
        if (!metadata) return null;

        const sessions = Object.values(metadata.sessionsByDay).flat();

        const theoryHours = sessions
          .filter(s => s.sessionType.name === 'THEORY')
          .reduce((sum, s) => sum + s.totalHours, 0);

        const practiceHours = sessions
          .filter(s => s.sessionType.name === 'PRACTICE')
          .reduce((sum, s) => sum + s.totalHours, 0);

        const theorySessions = sessions.filter(s => s.sessionType.name === 'THEORY').length;
        const practiceSessions = sessions.filter(s => s.sessionType.name === 'PRACTICE').length;

        return {
          totalAvailableHours: metadata.availabilityHours,
          totalAssignedHours: metadata.totalAssignedHours,
          utilizationPercentage: metadata.utilizationRate,
          sessionsByType: {
            theory: theorySessions,
            practice: practiceSessions
          },
          hoursByType: {
            theory: theoryHours,
            practice: practiceHours
          }
        };
      })
    );
  }

  /**
   * Obtiene las sesiones de un día específico
   */
  getSessionsForDay(day: DayOfWeek): ClassSessionResponse[] {
    const currentMetadata = this._teacherScheduleMetadata$.value;
    if (!currentMetadata) return [];

    return currentMetadata.sessionsByDay[day] || [];
  }

  /**
   * Verifica si el docente tiene disponibilidad en un horario específico
   */
  hasAvailabilityAt(day: DayOfWeek, startTime: string, endTime: string): boolean {
    const sessions = this.getSessionsForDay(day);

    // Verificar si hay conflictos con sesiones existentes
    return !sessions.some(session => {
      const sessionStart = session.teachingHours[0]?.startTime;
      const sessionEnd = session.teachingHours[session.teachingHours.length - 1]?.endTime;

      return this.timesOverlap(startTime, endTime, sessionStart, sessionEnd);
    });
  }

  /**
   * Limpia los metadatos
   */
  clearMetadata(): void {
    this._teacherScheduleMetadata$.next(null);
    this.metadataCache.clear();
  }

  /**
   * Obtiene sugerencias para el docente
   */
  getTeacherSuggestions(): Observable<string[]> {
    return this.teacherScheduleMetadata$.pipe(
      map(metadata => {
        if (!metadata) return [];

        const suggestions: string[] = [];

        // Sugerencias basadas en carga de trabajo
        if (metadata.workloadPercentage < 20) {
          suggestions.push('El docente tiene baja carga horaria, puede asignar más clases');
        } else if (metadata.workloadPercentage > 80) {
          suggestions.push('Carga horaria alta, verificar disponibilidad antes de asignar más');
        }

        // Sugerencias de distribución
        const sessionsPerDay = Object.values(metadata.sessionsByDay);
        const daysWithClasses = sessionsPerDay.filter(sessions => sessions.length > 0).length;

        if (daysWithClasses <= 2) {
          suggestions.push('Considerar distribuir las clases en más días de la semana');
        }

        // Verificar días con muchas horas seguidas
        sessionsPerDay.forEach((daySessions, index) => {
          if (daySessions.length > 4) {
            const dayName = Object.keys(metadata.sessionsByDay)[index];
            suggestions.push(`${dayName}: Muchas clases en un solo día, verificar descansos`);
          }
        });

        return suggestions;
      })
    );
  }

  // Métodos auxiliares privados
  private estimateWeeklyAvailability(teacher: TeacherResponse): number {
    // Estimación basada en disponibilidad típica de docente
    // En una implementación real, esto se calcularía desde TeacherAvailabilityEntity
    return teacher.totalAvailabilities ? teacher.totalAvailabilities * 2 : 40; // Estimación de 40h semanales
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
