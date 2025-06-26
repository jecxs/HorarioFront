// src/app/features/schedule-assignment/services/course-metadata.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CourseMetadata, GroupCoursesSummary, CourseAssignmentStats } from '../models/course-metadata.model';
import { CourseResponse, ClassSessionResponse, StudentGroupResponse } from '../models/class-session.model';

@Injectable({
  providedIn: 'root'
})
export class CourseMetadataService {

  // Estado observable del resumen de cursos del grupo actual
  private _groupCoursesSummary$ = new BehaviorSubject<GroupCoursesSummary | null>(null);
  public groupCoursesSummary$ = this._groupCoursesSummary$.asObservable();

  // Cache de metadatos por grupo
  private metadataCache = new Map<string, GroupCoursesSummary>();

  /**
   * Calcula y actualiza los metadatos de cursos para un grupo específico
   */
  updateGroupCoursesMetadata(
    group: StudentGroupResponse,
    courses: CourseResponse[],
    sessions: ClassSessionResponse[]
  ): void {
    console.log('=== CALCULATING COURSE METADATA ===');
    console.log('Group:', group.name);
    console.log('Courses:', courses.length);
    console.log('Sessions:', sessions.length);

    const courseMetadataList: CourseMetadata[] = courses.map(course => {
      return this.calculateCourseMetadata(course, sessions);
    });

    const summary: GroupCoursesSummary = {
      groupUuid: group.uuid,
      groupName: group.name,
      cycleNumber: group.cycleNumber,
      careerName: group.careerName,
      totalCourses: courses.length,
      completedCourses: courseMetadataList.filter(c => c.isCompleted).length,
      totalRequiredHours: courseMetadataList.reduce((sum, c) => sum + c.totalRequiredHours, 0),
      totalAssignedHours: courseMetadataList.reduce((sum, c) => sum + c.assignedHours, 0),
      totalRemainingHours: courseMetadataList.reduce((sum, c) => sum + c.remainingHours, 0),
      overallProgress: this.calculateOverallProgress(courseMetadataList),
      courses: courseMetadataList.sort((a, b) => b.remainingHours - a.remainingHours), // Ordenar por horas pendientes
      lastUpdated: new Date()
    };

    console.log('Summary calculated:', summary);

    // Actualizar cache y estado
    this.metadataCache.set(group.uuid, summary);
    this._groupCoursesSummary$.next(summary);
  }

  /**
   * Calcula metadatos para un curso específico
   */
  private calculateCourseMetadata(course: CourseResponse, allSessions: ClassSessionResponse[]): CourseMetadata {
    // Filtrar sesiones de este curso
    const courseSessions = allSessions.filter(session => session.course.uuid === course.uuid);

    // ✅ IMPORTANTE: Calcular horas asignadas POR TIPO DE SESIÓN
    const assignedTheoryHours = courseSessions
      .filter(session => session.sessionType.name === 'THEORY')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const assignedPracticeHours = courseSessions
      .filter(session => session.sessionType.name === 'PRACTICE')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const assignedHours = assignedTheoryHours + assignedPracticeHours;

    // Calcular horas requeridas
    const requiredTheoryHours = course.weeklyTheoryHours;
    const requiredPracticeHours = course.weeklyPracticeHours;
    const totalRequiredHours = requiredTheoryHours + requiredPracticeHours;

    // Calcular horas restantes POR TIPO
    const remainingTheoryHours = Math.max(0, requiredTheoryHours - assignedTheoryHours);
    const remainingPracticeHours = Math.max(0, requiredPracticeHours - assignedPracticeHours);
    const remainingHours = remainingTheoryHours + remainingPracticeHours;

    // Calcular progreso
    const progressPercentage = totalRequiredHours > 0
      ? Math.round((assignedHours / totalRequiredHours) * 100)
      : 0;

    return {
      course,
      totalRequiredHours,
      requiredTheoryHours,        // ✅ ASEGÚRATE de que tengas esto
      requiredPracticeHours,      // ✅ ASEGÚRATE de que tengas esto
      assignedHours,
      assignedTheoryHours,        // ✅ ASEGÚRATE de que tengas esto
      assignedPracticeHours,      // ✅ ASEGÚRATE de que tengas esto
      remainingHours,
      remainingTheoryHours,       // ✅ ASEGÚRATE de que tengas esto
      remainingPracticeHours,     // ✅ ASEGÚRATE de que tengas esto
      progressPercentage,
      isCompleted: remainingHours === 0,
      sessionsCount: courseSessions.length,
      sessions: courseSessions
    };
  }

  /**
   * Calcula el progreso general de todos los cursos
   */
  private calculateOverallProgress(courseMetadataList: CourseMetadata[]): number {
    if (courseMetadataList.length === 0) return 0;

    const totalRequired = courseMetadataList.reduce((sum, c) => sum + c.totalRequiredHours, 0);
    const totalAssigned = courseMetadataList.reduce((sum, c) => sum + c.assignedHours, 0);

    return totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 0;
  }

  /**
   * Obtiene estadísticas de asignación por tipo
   */
  getAssignmentStats(): Observable<CourseAssignmentStats | null> {
    return this.groupCoursesSummary$.pipe(
      map(summary => {
        if (!summary) return null;

        const totalTheoryHours = summary.courses.reduce((sum, c) => sum + c.requiredTheoryHours, 0);
        const totalPracticeHours = summary.courses.reduce((sum, c) => sum + c.requiredPracticeHours, 0);
        const assignedTheoryHours = summary.courses.reduce((sum, c) => sum + c.assignedTheoryHours, 0);
        const assignedPracticeHours = summary.courses.reduce((sum, c) => sum + c.assignedPracticeHours, 0);

        return {
          totalTheoryHours,
          totalPracticeHours,
          assignedTheoryHours,
          assignedPracticeHours,
          remainingTheoryHours: totalTheoryHours - assignedTheoryHours,
          remainingPracticeHours: totalPracticeHours - assignedPracticeHours,
          completionPercentage: summary.overallProgress
        };
      })
    );
  }

  /**
   * Obtiene metadatos de un curso específico
   */
  private getCourseMetadata(courseUuid: string): CourseMetadata | null {
    const currentSummary = this._groupCoursesSummary$.value;
    if (!currentSummary) return null;

    return currentSummary.courses.find(c => c.course.uuid === courseUuid) || null;
  }
  /**
   * Obtiene los cursos que necesitan más asignaciones (ordenados por horas pendientes)
   */
  getCoursesNeedingAssignment(): Observable<CourseMetadata[]> {
    return this.groupCoursesSummary$.pipe(
      map(summary => {
        if (!summary) return [];
        return summary.courses.filter(c => c.remainingHours > 0);
      })
    );
  }

  /**
   * Limpia el estado y cache
   */
  clearMetadata(): void {
    this._groupCoursesSummary$.next(null);
    this.metadataCache.clear();
  }

  /**
   * Verifica si un curso tiene horas pendientes de un tipo específico
   */
  hasRemainingHours(courseUuid: string, type?: 'THEORY' | 'PRACTICE'): boolean {
    const metadata = this.getCourseMetadata(courseUuid);
    if (!metadata) return false;

    if (type === 'THEORY') return metadata.remainingTheoryHours > 0;
    if (type === 'PRACTICE') return metadata.remainingPracticeHours > 0;
    return metadata.remainingHours > 0;
  }

  /**
   * Obtiene sugerencias basadas en el estado actual
   */
  getAssignmentSuggestions(): Observable<string[]> {
    return this.groupCoursesSummary$.pipe(
      map(summary => {
        if (!summary) return [];

        const suggestions: string[] = [];

        // Sugerencias basadas en cursos incompletos
        const incompleteCourses = summary.courses.filter(c => !c.isCompleted);

        if (incompleteCourses.length > 0) {
          const mostPending = incompleteCourses[0]; // Ya están ordenados por horas pendientes
          suggestions.push(`Priorizar: "${mostPending.course.name}" necesita ${mostPending.remainingHours}h más`);
        }

        // Sugerencias de balance
        const onlyTheoryPending = summary.courses.filter(c => c.remainingTheoryHours > 0 && c.remainingPracticeHours === 0);
        const onlyPracticePending = summary.courses.filter(c => c.remainingPracticeHours > 0 && c.remainingTheoryHours === 0);

        if (onlyTheoryPending.length > 0) {
          suggestions.push(`${onlyTheoryPending.length} curso(s) necesitan solo horas teóricas`);
        }

        if (onlyPracticePending.length > 0) {
          suggestions.push(`${onlyPracticePending.length} curso(s) necesitan solo horas prácticas`);
        }

        // Sugerencia de progreso
        if (summary.overallProgress < 30) {
          suggestions.push('Considera asignar varias materias básicas primero');
        } else if (summary.overallProgress > 80) {
          suggestions.push('¡Muy buen progreso! Solo faltan algunos detalles');
        }

        return suggestions;
      })
    );
  }
  /**
   * ✅ NUEVO: Obtiene horas asignadas por tipo para un curso específico
   * Este método es ESENCIAL para el dialog de asignación
   */
  getAssignedHoursByType(courseUuid: string): {
    theory: number;
    practice: number;
  } {
    const currentSummary = this._groupCoursesSummary$.value;
    if (!currentSummary) {
      console.log('No metadata available, returning zeros');
      return { theory: 0, practice: 0 };
    }

    // Buscar el curso en los metadatos actuales
    const courseMetadata = currentSummary.courses.find(c => c.course.uuid === courseUuid);
    if (!courseMetadata) {
      console.log(`Course ${courseUuid} not found in metadata, returning zeros`);
      return { theory: 0, practice: 0 };
    }

    console.log(`Course ${courseUuid} - Assigned hours: Theory=${courseMetadata.assignedTheoryHours}, Practice=${courseMetadata.assignedPracticeHours}`);

    return {
      theory: courseMetadata.assignedTheoryHours,
      practice: courseMetadata.assignedPracticeHours
    };
  }

  /**
   * ✅ NUEVO: Verifica si un curso puede aceptar más horas de un tipo específico
   */
  canAddMoreHours(courseUuid: string, sessionType: 'THEORY' | 'PRACTICE'): boolean {
    const courseMetadata = this.getCourseMetadata(courseUuid);
    if (!courseMetadata) return false;

    if (sessionType === 'THEORY') {
      return courseMetadata.assignedTheoryHours < courseMetadata.requiredTheoryHours;
    } else {
      return courseMetadata.assignedPracticeHours < courseMetadata.requiredPracticeHours;
    }
  }

  /**
   * ✅ NUEVO: Obtiene horas restantes para un tipo de sesión
   */
  getRemainingHours(courseUuid: string, sessionType: 'THEORY' | 'PRACTICE'): number {
    const courseMetadata = this.getCourseMetadata(courseUuid);
    if (!courseMetadata) return 0;

    if (sessionType === 'THEORY') {
      return Math.max(0, courseMetadata.requiredTheoryHours - courseMetadata.assignedTheoryHours);
    } else {
      return Math.max(0, courseMetadata.requiredPracticeHours - courseMetadata.assignedPracticeHours);
    }
  }

  /**
   * ✅ NUEVO: Verifica si un curso está sobrecargado en algún tipo de sesión
   */
  isCourseOverloaded(courseUuid: string): {
    theory: boolean;
    practice: boolean;
    any: boolean;
  } {
    const courseMetadata = this.getCourseMetadata(courseUuid);
    if (!courseMetadata) return { theory: false, practice: false, any: false };

    const theoryOverloaded = courseMetadata.assignedTheoryHours > courseMetadata.requiredTheoryHours;
    const practiceOverloaded = courseMetadata.assignedPracticeHours > courseMetadata.requiredPracticeHours;

    return {
      theory: theoryOverloaded,
      practice: practiceOverloaded,
      any: theoryOverloaded || practiceOverloaded
    };
  }
}
