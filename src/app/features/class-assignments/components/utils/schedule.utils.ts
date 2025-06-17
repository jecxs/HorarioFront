// src/app/features/class-assignments/utils/schedule.utils.ts
import { TeachingHour, ClassSession, Teacher, LearningSpace, StudentGroup } from '../services/class-assignment.service';

export class ScheduleUtils {

  /**
   * Formatea tiempo a formato HH:mm
   */
  static formatTime(time: string): string {
    if (!time) return '';
    return time.slice(0, 5);
  }

  /**
   * Formatea rango de tiempo
   */
  static formatTimeRange(startTime: string, endTime: string): string {
    return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
  }

  /**
   * Convierte día de la semana a español
   */
  static getDayLabel(day: string): string {
    const labels: { [key: string]: string } = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes',
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes',
      'SATURDAY': 'Sábado',
      'SUNDAY': 'Domingo'
    };
    return labels[day] || day;
  }

  /**
   * Obtiene el día actual de la semana
   */
  static getCurrentDayOfWeek(): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  }

  /**
   * Verifica si las horas pedagógicas son consecutivas
   */
  static areHoursConsecutive(hours: TeachingHour[]): boolean {
    if (hours.length <= 1) return true;

    const sorted = [...hours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].orderInTimeSlot !== sorted[i - 1].orderInTimeSlot + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calcula la duración total de horas pedagógicas
   */
  static calculateTotalDuration(hours: TeachingHour[]): number {
    return hours.reduce((total, hour) => total + hour.durationMinutes, 0);
  }

  /**
   * Obtiene el rango de tiempo de una lista de horas
   */
  static getHoursTimeRange(hours: TeachingHour[]): { start: string, end: string } {
    if (hours.length === 0) return { start: '', end: '' };

    const sorted = [...hours].sort((a, b) => a.startTime.localeCompare(b.startTime));
    return {
      start: sorted[0].startTime,
      end: sorted[sorted.length - 1].endTime
    };
  }

  /**
   * Determina el tipo de curso basado en horas
   */
  static getCourseType(theoryHours: number, practiceHours: number): 'THEORY' | 'PRACTICE' | 'MIXED' {
    const hasTheory = theoryHours > 0;
    const hasPractice = practiceHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'THEORY';
  }

  /**
   * Obtiene el color del tipo de curso
   */
  static getCourseTypeColor(type: string): string {
    switch (type) {
      case 'THEORY': return 'primary';
      case 'PRACTICE': return 'warn';
      case 'MIXED': return 'accent';
      default: return 'default';
    }
  }

  /**
   * Obtiene el icono del tipo de curso
   */
  static getCourseTypeIcon(type: string): string {
    switch (type) {
      case 'THEORY': return 'menu_book';
      case 'PRACTICE': return 'science';
      case 'MIXED': return 'hub';
      default: return 'school';
    }
  }

  /**
   * Obtiene texto descriptivo del tipo de curso
   */
  static getCourseTypeText(type: string): string {
    switch (type) {
      case 'THEORY': return 'Teórico';
      case 'PRACTICE': return 'Práctico';
      case 'MIXED': return 'Mixto';
      default: return 'Sin definir';
    }
  }

  /**
   * Verifica si un tiempo está dentro de un rango
   */
  static isTimeInRange(time: string, startTime: string, endTime: string): boolean {
    return time >= startTime && time <= endTime;
  }

  /**
   * Verifica si dos rangos de tiempo se solapan
   */
  static doTimeRangesOverlap(
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Calcula la ocupación de un docente
   */
  static calculateTeacherWorkload(teacher: Teacher, sessions: ClassSession[]): {
    totalHours: number;
    sessionsCount: number;
    averageHoursPerSession: number;
    daysWithClasses: number;
  } {
    const teacherSessions = sessions.filter(session => session.teacher.uuid === teacher.uuid);
    const totalHours = teacherSessions.reduce((sum, session) => sum + session.totalHours, 0);
    const daysSet = new Set(teacherSessions.map(session => session.dayOfWeek));

    return {
      totalHours,
      sessionsCount: teacherSessions.length,
      averageHoursPerSession: teacherSessions.length > 0 ? totalHours / teacherSessions.length : 0,
      daysWithClasses: daysSet.size
    };
  }

  /**
   * Calcula la ocupación de un aula
   */
  static calculateSpaceOccupancy(space: LearningSpace, sessions: ClassSession[]): {
    totalHours: number;
    sessionsCount: number;
    occupancyRate: number;
    daysOccupied: number;
  } {
    const spaceSessions = sessions.filter(session => session.learningSpace.uuid === space.uuid);
    const totalHours = spaceSessions.reduce((sum, session) => sum + session.totalHours, 0);
    const daysSet = new Set(spaceSessions.map(session => session.dayOfWeek));

    // Asumiendo 45 horas semanales máximas (9 horas × 5 días)
    const maxWeeklyHours = 45;
    const occupancyRate = (totalHours / maxWeeklyHours) * 100;

    return {
      totalHours,
      sessionsCount: spaceSessions.length,
      occupancyRate: Math.min(100, occupancyRate),
      daysOccupied: daysSet.size
    };
  }

  /**
   * Calcula la carga académica de un grupo
   */
  static calculateGroupWorkload(group: StudentGroup, sessions: ClassSession[]): {
    totalHours: number;
    coursesCount: number;
    theoryHours: number;
    practiceHours: number;
    daysWithClasses: number;
  } {
    const groupSessions = sessions.filter(session => session.studentGroup.uuid === group.uuid);

    let theoryHours = 0;
    let practiceHours = 0;

    groupSessions.forEach(session => {
      if (session.sessionType.name === 'THEORY') {
        theoryHours += session.totalHours;
      } else {
        practiceHours += session.totalHours;
      }
    });

    const coursesSet = new Set(groupSessions.map(session => session.course.uuid));
    const daysSet = new Set(groupSessions.map(session => session.dayOfWeek));

    return {
      totalHours: theoryHours + practiceHours,
      coursesCount: coursesSet.size,
      theoryHours,
      practiceHours,
      daysWithClasses: daysSet.size
    };
  }

  /**
   * Encuentra conflictos en el horario
   */
  static findScheduleConflicts(sessions: ClassSession[]): {
    teacherConflicts: ClassSession[][];
    spaceConflicts: ClassSession[][];
    groupConflicts: ClassSession[][];
  } {
    const teacherConflicts: ClassSession[][] = [];
    const spaceConflicts: ClassSession[][] = [];
    const groupConflicts: ClassSession[][] = [];

    // Agrupar sesiones por día y hora
    const sessionsByDayAndTime = new Map<string, ClassSession[]>();

    sessions.forEach(session => {
      session.teachingHours.forEach(hour => {
        const key = `${session.dayOfWeek}-${hour.startTime}-${hour.endTime}`;
        if (!sessionsByDayAndTime.has(key)) {
          sessionsByDayAndTime.set(key, []);
        }
        sessionsByDayAndTime.get(key)!.push(session);
      });
    });

    // Buscar conflictos
    sessionsByDayAndTime.forEach(sessionsInSlot => {
      if (sessionsInSlot.length > 1) {
        // Conflictos de docente
        const teacherGroups = this.groupBy(sessionsInSlot, s => s.teacher.uuid);
        Object.values(teacherGroups).forEach(group => {
          if (group.length > 1) {
            teacherConflicts.push(group);
          }
        });

        // Conflictos de aula
        const spaceGroups = this.groupBy(sessionsInSlot, s => s.learningSpace.uuid);
        Object.values(spaceGroups).forEach(group => {
          if (group.length > 1) {
            spaceConflicts.push(group);
          }
        });

        // Conflictos de grupo
        const groupGroups = this.groupBy(sessionsInSlot, s => s.studentGroup.uuid);
        Object.values(groupGroups).forEach(group => {
          if (group.length > 1) {
            groupConflicts.push(group);
          }
        });
      }
    });

    return { teacherConflicts, spaceConflicts, groupConflicts };
  }

  /**
   * Genera sugerencias para resolver conflictos
   */
  static generateConflictSuggestions(
    conflictType: 'TEACHER' | 'SPACE' | 'GROUP',
    conflictingSessions: ClassSession[]
  ): string[] {
    const suggestions: string[] = [];

    switch (conflictType) {
      case 'TEACHER':
        suggestions.push('Cambiar el horario de una de las sesiones');
        suggestions.push('Asignar un docente diferente');
        suggestions.push('Dividir la sesión en múltiples bloques');
        break;

      case 'SPACE':
        suggestions.push('Cambiar el aula de una de las sesiones');
        suggestions.push('Modificar el horario para usar el aula en diferentes momentos');
        suggestions.push('Buscar un aula alternativa del mismo tipo');
        break;

      case 'GROUP':
        suggestions.push('Cambiar el horario de una de las clases');
        suggestions.push('Reorganizar el cronograma del grupo');
        suggestions.push('Coordinar con otros docentes del mismo grupo');
        break;
    }

    return suggestions;
  }

  /**
   * Valida la compatibilidad entre entidades
   */
  static validateSessionCompatibility(
    course: any,
    teacher: Teacher,
    space: LearningSpace,
    group: StudentGroup
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar docente-curso
    const hasCompatibleArea = teacher.knowledgeAreas.some(
      area => area.uuid === course.teachingKnowledgeArea.uuid
    );
    if (!hasCompatibleArea) {
      errors.push(`El docente no tiene el área de conocimiento requerida: ${course.teachingKnowledgeArea.name}`);
    }

    // Validar aula-curso
    const courseType = this.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours);
    if (courseType === 'PRACTICE' && space.teachingType.name !== 'PRACTICE') {
      errors.push('Se requiere un laboratorio para cursos prácticos');
    }

    // Validar especialidad de aula
    if (course.preferredSpecialty && space.specialty?.uuid !== course.preferredSpecialty.uuid) {
      warnings.push(`Se recomienda un laboratorio de ${course.preferredSpecialty.name}`);
    }

    // Validar grupo-curso
    if (group.cycleUuid !== course.cycle.uuid) {
      errors.push('El curso debe pertenecer al mismo ciclo que el grupo');
    }

    // Validar capacidad
    const estimatedStudents = 30; // Esto debería venir de datos reales
    if (space.capacity < estimatedStudents) {
      warnings.push(`El aula podría ser pequeña para el grupo (capacidad: ${space.capacity})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Genera ID único para celda del horario
   */
  static generateCellId(day: string, hour: TeachingHour): string {
    return `${day}-${hour.uuid}`;
  }

  /**
   * Agrupa elementos por una función clave
   */
  private static groupBy<T>(array: T[], keyFn: (item: T) => string): { [key: string]: T[] } {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }

  /**
   * Calcula estadísticas del horario
   */
  static calculateScheduleStatistics(sessions: ClassSession[]): {
    totalSessions: number;
    totalHours: number;
    averageSessionDuration: number;
    theoryPercentage: number;
    practicePercentage: number;
    teachersCount: number;
    spacesCount: number;
    groupsCount: number;
    conflictsCount: number;
  } {
    const totalSessions = sessions.length;
    const totalHours = sessions.reduce((sum, session) => sum + session.totalHours, 0);
    const averageSessionDuration = totalSessions > 0 ? totalHours / totalSessions : 0;

    const theoryHours = sessions
      .filter(s => s.sessionType.name === 'THEORY')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const practiceHours = sessions
      .filter(s => s.sessionType.name === 'PRACTICE')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const theoryPercentage = totalHours > 0 ? (theoryHours / totalHours) * 100 : 0;
    const practicePercentage = totalHours > 0 ? (practiceHours / totalHours) * 100 : 0;

    const teachersSet = new Set(sessions.map(s => s.teacher.uuid));
    const spacesSet = new Set(sessions.map(s => s.learningSpace.uuid));
    const groupsSet = new Set(sessions.map(s => s.studentGroup.uuid));

    const conflicts = this.findScheduleConflicts(sessions);
    const conflictsCount = conflicts.teacherConflicts.length +
      conflicts.spaceConflicts.length +
      conflicts.groupConflicts.length;

    return {
      totalSessions,
      totalHours,
      averageSessionDuration: Math
