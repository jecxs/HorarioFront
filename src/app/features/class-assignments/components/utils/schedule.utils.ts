// src/app/features/class-assignments/utils/schedule.utils.ts
import { TeachingHour, ClassSession, Teacher, LearningSpace, StudentGroup, Course } from '../services/class-assignment.service';

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
      averageHoursPerSession: teacherSessions.length > 0 ?
        Math.round((totalHours / teacherSessions.length) * 100) / 100 : 0,
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
      occupancyRate: Math.min(100, Math.round(occupancyRate * 100) / 100),
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
  static generateSuggestions(
    course: Course,
    group: StudentGroup,
    space: LearningSpace,
    sessions: ClassSession[]
  ): string[] {
    const suggestions: string[] = [];

    // Verificar compatibilidad de tipo de curso y aula
    const courseType = this.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours);

    if (courseType === 'PRACTICE' && space.teachingType?.name !== 'PRACTICE') {
      suggestions.push('Recomendado: Usar un laboratorio para cursos prácticos');
    }

    if (courseType === 'MIXED' && space.teachingType?.name === 'THEORY') {
      suggestions.push('Recomendado: Usar un aula con equipamiento práctico');
    }

    // Verificar capacidad
    const estimatedStudents = 30; // Esto debería venir de datos reales del grupo
    if (space.capacity < estimatedStudents) {
      suggestions.push(`Advertencia: El aula podría ser pequeña (capacidad: ${space.capacity})`);
    }

    // Verificar carga del grupo
    const groupWorkload = this.calculateGroupWorkload(group, sessions);
    if (groupWorkload.totalHours > 30) {
      suggestions.push('Advertencia: El grupo podría tener sobrecarga de horas');
    }

    return suggestions;
  }

  /**
   * Valida asignación completa
   */
  static validateAssignment(
    course: Course,
    teacher: Teacher,
    group: StudentGroup,
    space: LearningSpace,
    hours: TeachingHour[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar que las horas sean consecutivas si hay más de una
    if (hours.length > 1 && !this.areHoursConsecutive(hours)) {
      warnings.push('Las horas pedagógicas no son consecutivas');
    }

    // Validar duración mínima y máxima
    const totalDuration = this.calculateTotalDuration(hours);
    if (totalDuration < 45) {
      errors.push('La sesión debe durar al menos 45 minutos');
    }
    if (totalDuration > 180) {
      warnings.push('Sesiones largas (>3 horas) pueden afectar el rendimiento');
    }

    // Validar tipo de curso vs aula
    const courseType = this.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours);

    if (courseType === 'PRACTICE' && space.teachingType?.name !== 'PRACTICE') {
      warnings.push('Se requiere un laboratorio para cursos prácticos');
    }

    // Validar especialidad de aula
    if (course.preferredSpecialty && space.specialty?.uuid !== course.preferredSpecialty.uuid) {
      warnings.push(`Se recomienda un laboratorio de ${course.preferredSpecialty.name}`);
    }

    // Validar grupo-curso
    if (group.cycle.uuid !== course.cycle.uuid) {
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
    const averageSessionDuration = totalSessions > 0 ?
      Math.round((totalHours / totalSessions) * 100) / 100 : 0;

    const theoryHours = sessions
      .filter(s => s.sessionType.name === 'THEORY')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const practiceHours = sessions
      .filter(s => s.sessionType.name === 'PRACTICE')
      .reduce((sum, session) => sum + session.totalHours, 0);

    const theoryPercentage = totalHours > 0 ?
      Math.round((theoryHours / totalHours) * 10000) / 100 : 0;
    const practicePercentage = totalHours > 0 ?
      Math.round((practiceHours / totalHours) * 10000) / 100 : 0;

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
      averageSessionDuration,
      theoryPercentage,
      practicePercentage,
      teachersCount: teachersSet.size,
      spacesCount: spacesSet.size,
      groupsCount: groupsSet.size,
      conflictsCount
    };
  }

  /**
   * Obtiene el texto de severidad de conflicto
   */
  static getConflictSeverityText(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    switch (severity) {
      case 'LOW': return 'Bajo';
      case 'MEDIUM': return 'Medio';
      case 'HIGH': return 'Alto';
      case 'CRITICAL': return 'Crítico';
      default: return 'Desconocido';
    }
  }

  /**
   * Obtiene el color del indicador de severidad
   */
  static getSeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    switch (severity) {
      case 'LOW': return '#4CAF50';     // Verde
      case 'MEDIUM': return '#FF9800';  // Naranja
      case 'HIGH': return '#F44336';    // Rojo
      case 'CRITICAL': return '#9C27B0'; // Púrpura
      default: return '#757575';         // Gris
    }
  }

  /**
   * Determina si es un horario pedagógicamente óptimo
   */
  static isOptimalTime(hour: TeachingHour): boolean {
    const startHour = parseInt(hour.startTime.split(':')[0]);
    // Horario óptimo: 8:00 AM - 4:00 PM
    return startHour >= 8 && startHour <= 16;
  }

  /**
   * Calcula puntuación de compatibilidad entre docente y curso
   */
  static calculateTeacherCourseCompatibility(teacher: Teacher, course: Course): number {
    let score = 0;

    // Verificar áreas de conocimiento compatibles
    const teacherAreas = teacher.knowledgeAreas || [];
    if (course.knowledgeArea && teacherAreas.some(area => area.uuid === course.knowledgeArea.uuid)) {
      score += 50; // 50% por área de conocimiento compatible
    }

    // Verificar departamento académico
    if (teacher.academicDepartment && course.knowledgeArea?.academicDepartment &&
      teacher.academicDepartment.uuid === course.knowledgeArea.academicDepartment.uuid) {
      score += 30; // 30% por departamento académico compatible
    }

    // Puntuación adicional por experiencia (simulado)
    score += 20; // 20% base por competencia general

    return Math.min(100, score);
  }

  /**
   * Genera colores para el horario
   */
  static generateScheduleColors(): { [key: string]: string } {
    return {
      'MONDAY': '#2196F3',    // Azul
      'TUESDAY': '#4CAF50',   // Verde
      'WEDNESDAY': '#FF9800', // Naranja
      'THURSDAY': '#9C27B0',  // Púrpura
      'FRIDAY': '#F44336',    // Rojo
      'SATURDAY': '#607D8B',  // Azul gris
      'SUNDAY': '#795548'     // Marrón
    };
  }

  /**
   * Formatea información del docente para visualización
   */
  static formatTeacherDisplay(teacher: Teacher): string {
    const areas = teacher.knowledgeAreas?.map(area => area.name).join(', ') || 'Sin áreas';
    return `${teacher.firstName} ${teacher.lastName} - ${areas}`;
  }

  /**
   * Formatea información del aula para visualización
   */
  static formatSpaceDisplay(space: LearningSpace): string {
    const specialty = space.specialty?.name || 'General';
    const type = space.teachingType?.name || 'Teórico';
    return `${space.name} (${specialty} - ${type}) - Cap: ${space.capacity}`;
  }

  /**
   * Convierte minutos a formato HH:mm
   */
  static minutesToTimeFormat(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Calcula el tiempo total de una sesión basado en sus horas pedagógicas
   */
  static calculateSessionTotalTime(teachingHours: TeachingHour[]): string {
    const totalMinutes = this.calculateTotalDuration(teachingHours);
    return this.minutesToTimeFormat(totalMinutes);
  }
}
