// src/app/features/class-assignments/services/class-assignment.service.ts
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, debounceTime, distinctUntilChanged } from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';

// Interfaces principales
export interface ClassSession {
  uuid: string;
  studentGroup: StudentGroup;
  course: Course;
  teacher: Teacher;
  learningSpace: LearningSpace;
  dayOfWeek: string;
  sessionType: TeachingType;
  teachingHours: TeachingHour[];
  notes?: string;
  totalHours: number;
  timeSlotName: string;
}

export interface ClassSessionRequest {
  studentGroupUuid: string;
  courseUuid: string;
  teacherUuid: string;
  learningSpaceUuid: string;
  dayOfWeek: string;
  sessionTypeUuid: string;
  teachingHourUuids: string[];
  notes?: string;
}

export interface StudentGroup {
  uuid: string;
  name: string;
  cycleUuid: string;
  cycleNumber: number;
  periodUuid: string;
  periodName: string;
}

export interface Course {
  uuid: string;
  name: string;
  code: string;
  weeklyTheoryHours: number;
  weeklyPracticeHours: number;
  teachingTypes: TeachingType[];
  teachingKnowledgeArea: KnowledgeArea;
  preferredSpecialty?: LearningSpaceSpecialty;
  cycle: Cycle;
  career: Career;
  modality: EducationalModality;
}

export interface Teacher {
  uuid: string;
  fullName: string;
  email: string;
  phone?: string;
  department: AcademicDepartment;
  knowledgeAreas: KnowledgeArea[];
  hasUserAccount: boolean;
  totalAvailabilities: number;
}

export interface LearningSpace {
  uuid: string;
  name: string;
  capacity: number;
  teachingType: TeachingType;
  specialty?: LearningSpaceSpecialty;
}

export interface TeachingHour {
  uuid: string;
  orderInTimeSlot: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TimeSlot {
  uuid: string;
  name: string;
  startTime: string;
  endTime: string;
  teachingHours: TeachingHour[];
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions?: string[];
}

export interface SmartFilters {
  selectedCourse?: Course;
  selectedGroup?: StudentGroup;
  selectedTeacher?: Teacher;
  selectedDay?: string;
  selectedTimeSlot?: TimeSlot;
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictType: 'TEACHER' | 'SPACE' | 'GROUP' | 'MULTIPLE';
  message: string;
  conflictingSessions: ClassSession[];
}

// Interfaces auxiliares
export interface TeachingType {
  uuid: string;
  name: string;
}

export interface KnowledgeArea {
  uuid: string;
  name: string;
  description?: string;
  department: AcademicDepartment;
}

export interface AcademicDepartment {
  uuid: string;
  name: string;
  code?: string;
}

export interface LearningSpaceSpecialty {
  uuid: string;
  name: string;
  description?: string;
  department?: AcademicDepartment;
}

export interface Cycle {
  uuid: string;
  number: number;
}

export interface Career {
  uuid: string;
  name: string;
}

export interface EducationalModality {
  uuid: string;
  name: string;
  durationYears: number;
}

export interface TeacherAvailability {
  uuid: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassAssignmentService extends BaseApiService {

  // Subjects para filtros inteligentes
  private smartFiltersSubject = new BehaviorSubject<SmartFilters>({});
  public smartFilters$ = this.smartFiltersSubject.asObservable();

  // Cache para datos frecuentemente usados
  private teachersCache = new Map<string, Teacher[]>();
  private spacesCache = new Map<string, LearningSpace[]>();
  private availabilityCache = new Map<string, TeacherAvailability[]>();

  // === CLASS SESSIONS CRUD ===

  getAllClassSessions(): Observable<any> {
    return this.get<ClassSession[]>('/protected/class-sessions');
  }

  getClassSessionById(uuid: string): Observable<any> {
    return this.get<ClassSession>(`/protected/class-sessions/${uuid}`);
  }

  createClassSession(session: ClassSessionRequest): Observable<any> {
    return this.post<ClassSession>('/protected/class-sessions', session);
  }

  updateClassSession(uuid: string, session: ClassSessionRequest): Observable<any> {
    return this.put<ClassSession>(`/protected/class-sessions/${uuid}`, session);
  }

  deleteClassSession(uuid: string): Observable<any> {
    return this.delete(`/protected/class-sessions/${uuid}`);
  }

  // === FILTROS Y BÚSQUEDAS ===

  getSessionsByStudentGroup(groupUuid: string): Observable<any> {
    return this.get<ClassSession[]>(`/protected/class-sessions/student-group/${groupUuid}`);
  }

  getSessionsByTeacher(teacherUuid: string): Observable<any> {
    return this.get<ClassSession[]>(`/protected/class-sessions/teacher/${teacherUuid}`);
  }

  filterClassSessions(filters: any): Observable<any> {
    const params = this.createParams(filters);
    return this.get<ClassSession[]>('/protected/class-sessions/filter', params);
  }

  // === DATOS AUXILIARES ===

  getAllStudentGroups(): Observable<any> {
    return this.get<StudentGroup[]>('/protected/student-groups');
  }

  getAllCourses(): Observable<any> {
    return this.get<Course[]>('/protected/courses');
  }

  getAllTeachers(): Observable<any> {
    return this.get<Teacher[]>('/protected/teachers');
  }

  getAllLearningSpaces(): Observable<any> {
    return this.get<LearningSpace[]>('/protected/learning-space');
  }

  getAllTimeSlots(): Observable<any> {
    return this.get<TimeSlot[]>('/protected/timeslots');
  }

  getAllTeachingTypes(): Observable<any> {
    return this.get<TeachingType[]>('/protected/teaching-types');
  }

  getTeacherAvailabilities(teacherUuid: string): Observable<any> {
    return this.get<TeacherAvailability[]>(`/protected/teachers/${teacherUuid}/availabilities`);
  }

  checkTeacherAvailability(teacherUuid: string, dayOfWeek: string, startTime: string, endTime: string): Observable<any> {
    const params = this.createParams({ dayOfWeek, startTime, endTime });
    return this.get<boolean>(`/protected/teachers/${teacherUuid}/availabilities/check`, params);
  }

  // === MÉTODOS DE FILTRADO INTELIGENTE ===

  getEligibleTeachers(course: Course): Observable<Teacher[]> {
    const cacheKey = `course-${course.uuid}`;

    if (this.teachersCache.has(cacheKey)) {
      return new Observable(observer => {
        observer.next(this.teachersCache.get(cacheKey)!);
        observer.complete();
      });
    }

    // Filtrar docentes por área de conocimiento
    const knowledgeAreaUuids = [course.teachingKnowledgeArea.uuid];
    const params = this.createParams({ knowledgeAreaUuids });

    return this.get<any>('/protected/teachers/filter', params).pipe(
      map(response => {
        const teachers = Array.isArray(response.data) ? response.data : [response.data];
        this.teachersCache.set(cacheKey, teachers);
        return teachers;
      })
    );
  }

  getEligibleLearningSpaces(course: Course, requiredCapacity: number = 30): Observable<LearningSpace[]> {
    const cacheKey = `course-${course.uuid}-capacity-${requiredCapacity}`;

    if (this.spacesCache.has(cacheKey)) {
      return new Observable(observer => {
        observer.next(this.spacesCache.get(cacheKey)!);
        observer.complete();
      });
    }

    return this.getAllLearningSpaces().pipe(
      map(response => {
        let spaces = Array.isArray(response.data) ? response.data : [response.data];

        // Filtrar por capacidad
        spaces = spaces.filter((space: LearningSpace) => space.capacity >= requiredCapacity);

        // Filtrar por tipo de enseñanza
        const courseType = this.getCourseType(course);
        if (courseType === 'PRACTICE' || courseType === 'MIXED') {
          // Para cursos prácticos, filtrar por especialidad si está especificada
          if (course.preferredSpecialty) {
            spaces = spaces.filter((space: LearningSpace) =>
              space.teachingType.name === 'PRACTICE' &&
              space.specialty?.uuid === course.preferredSpecialty?.uuid
            );
          } else {
            spaces = spaces.filter((space: LearningSpace) =>
              space.teachingType.name === 'PRACTICE'
            );
          }
        } else if (courseType === 'THEORY') {
          spaces = spaces.filter((space: LearningSpace) =>
            space.teachingType.name === 'THEORY'
          );
        }

        this.spacesCache.set(cacheKey, spaces);
        return spaces;
      })
    );
  }

  getAvailableTeachingHours(
    teacherUuid: string,
    learningSpaceUuid: string,
    groupUuid: string,
    dayOfWeek: string,
    timeSlotUuid?: string
  ): Observable<TeachingHour[]> {

    return combineLatest([
      this.getAllTimeSlots(),
      this.getTeacherAvailabilities(teacherUuid),
      this.filterClassSessions({
        dayOfWeek,
        teacherUuid,
        learningSpaceUuid,
        studentGroupUuid: groupUuid
      })
    ]).pipe(
      map(([timeSlotsResponse, availabilityResponse, conflictsResponse]) => {
        const timeSlots = Array.isArray(timeSlotsResponse.data) ? timeSlotsResponse.data : [timeSlotsResponse.data];
        const availabilities = Array.isArray(availabilityResponse.data) ? availabilityResponse.data : [availabilityResponse.data];
        const conflicts = Array.isArray(conflictsResponse.data) ? conflictsResponse.data : [conflictsResponse.data];

        let availableHours: TeachingHour[] = [];

        // Si se especifica un turno, usar solo ese
        const slotsToCheck = timeSlotUuid
          ? timeSlots.filter((slot: TimeSlot) => slot.uuid === timeSlotUuid)
          : timeSlots;

        slotsToCheck.forEach((slot: TimeSlot) => {
          // Verificar disponibilidad del docente en este turno
          const teacherAvailableInSlot = this.isTeacherAvailableInTimeSlot(
            availabilities, dayOfWeek, slot
          );

          if (teacherAvailableInSlot) {
            // Obtener horas pedagógicas no ocupadas
            const freeHours = this.getFreeTeachingHoursInSlot(slot, conflicts);
            availableHours = [...availableHours, ...freeHours];
          }
        });

        return availableHours.sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
      })
    );
  }

  // === VALIDACIONES EN TIEMPO REAL ===

  validateAssignmentInRealTime(
    courseUuid: string,
    teacherUuid: string,
    learningSpaceUuid: string,
    groupUuid: string,
    dayOfWeek: string,
    teachingHourUuids: string[]
  ): Observable<ValidationResult> {

    return combineLatest([
      this.getCourseById(courseUuid),
      this.getTeacherById(teacherUuid),
      this.getLearningSpaceById(learningSpaceUuid),
      this.getStudentGroupById(groupUuid),
      this.checkConflicts(teacherUuid, learningSpaceUuid, groupUuid, dayOfWeek, teachingHourUuids)
    ]).pipe(
      map(([courseRes, teacherRes, spaceRes, groupRes, conflictRes]) => {
        const course = courseRes.data;
        const teacher = teacherRes.data;
        const space = spaceRes.data;
        const group = groupRes.data;
        const conflicts = conflictRes;

        const warnings: string[] = [];
        const errors: string[] = [];
        const suggestions: string[] = [];

        // Validar compatibilidad docente-curso
        const teacherCompatible = this.validateTeacherCourseCompatibility(teacher, course);
        if (!teacherCompatible.isValid) {
          errors.push(...teacherCompatible.errors);
          suggestions.push(...teacherCompatible.suggestions);
        }

        // Validar compatibilidad espacio-curso
        const spaceCompatible = this.validateSpaceCourseCompatibility(space, course);
        if (!spaceCompatible.isValid) {
          errors.push(...spaceCompatible.errors);
          suggestions.push(...spaceCompatible.suggestions);
        }

        // Validar grupo-curso
        const groupCompatible = this.validateGroupCourseCompatibility(group, course);
        if (!groupCompatible.isValid) {
          errors.push(...groupCompatible.errors);
        }

        // Verificar conflictos
        if (conflicts.hasConflict) {
          errors.push(conflicts.message);
        }

        // Generar advertencias inteligentes
        this.generateSmartWarnings(course, teacher, space, teachingHourUuids, warnings, suggestions);

        return {
          isValid: errors.length === 0,
          warnings,
          errors,
          suggestions
        };
      })
    );
  }

  // === MÉTODOS AUXILIARES ===

  private getCourseType(course: Course): 'THEORY' | 'PRACTICE' | 'MIXED' {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'THEORY';
  }

  private isTeacherAvailableInTimeSlot(
    availabilities: TeacherAvailability[],
    dayOfWeek: string,
    timeSlot: TimeSlot
  ): boolean {
    return availabilities.some(availability =>
      availability.dayOfWeek === dayOfWeek &&
      availability.startTime <= timeSlot.startTime &&
      availability.endTime >= timeSlot.endTime
    );
  }

  private getFreeTeachingHoursInSlot(timeSlot: TimeSlot, conflicts: ClassSession[]): TeachingHour[] {
    const occupiedHourUuids = new Set(
      conflicts.flatMap(session => session.teachingHours.map(hour => hour.uuid))
    );

    return timeSlot.teachingHours.filter(hour => !occupiedHourUuids.has(hour.uuid));
  }

  private validateTeacherCourseCompatibility(teacher: Teacher, course: Course): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Verificar área de conocimiento
    const hasCompatibleArea = teacher.knowledgeAreas.some(
      area => area.uuid === course.teachingKnowledgeArea.uuid
    );

    if (!hasCompatibleArea) {
      errors.push(`El docente no tiene el área de conocimiento requerida: ${course.teachingKnowledgeArea.name}`);
      suggestions.push(`Buscar docentes del departamento: ${course.teachingKnowledgeArea.department.name}`);
    }

    return {
      isValid: errors.length === 0,
      warnings: [],
      errors,
      suggestions
    };
  }

  private validateSpaceCourseCompatibility(space: LearningSpace, course: Course): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    const courseType = this.getCourseType(course);

    // Verificar tipo de espacio
    if (courseType === 'PRACTICE' || courseType === 'MIXED') {
      if (space.teachingType.name !== 'PRACTICE') {
        errors.push('Se requiere un laboratorio para cursos prácticos');
        suggestions.push('Seleccionar un espacio de tipo práctico/laboratorio');
      }

      // Verificar especialidad si está especificada
      if (course.preferredSpecialty && space.specialty?.uuid !== course.preferredSpecialty.uuid) {
        errors.push(`Se requiere laboratorio de especialidad: ${course.preferredSpecialty.name}`);
        suggestions.push(`Buscar laboratorios de ${course.preferredSpecialty.name}`);
      }
    } else if (courseType === 'THEORY' && space.teachingType.name !== 'THEORY') {
      errors.push('Se recomienda un aula teórica para cursos teóricos');
      // No es error crítico, solo sugerencia
    }

    return {
      isValid: errors.length === 0,
      warnings: [],
      errors,
      suggestions
    };
  }

  private validateGroupCourseCompatibility(group: StudentGroup, course: Course): ValidationResult {
    const errors: string[] = [];

    // Verificar que el curso pertenece al mismo ciclo
    if (group.cycleUuid !== course.cycle.uuid) {
      errors.push('El curso debe pertenecer al mismo ciclo que el grupo');
    }

    return {
      isValid: errors.length === 0,
      warnings: [],
      errors,
      suggestions: []
    };
  }

  private generateSmartWarnings(
    course: Course,
    teacher: Teacher,
    space: LearningSpace,
    teachingHourUuids: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // Advertir sobre capacidad del aula
    if (space.capacity < 25) {
      warnings.push(`El aula tiene capacidad reducida (${space.capacity} estudiantes)`);
    }

    // Advertir sobre disponibilidad limitada del docente
    if (teacher.totalAvailabilities < 10) {
      warnings.push('El docente tiene pocas horas de disponibilidad registradas');
      suggestions.push('Verificar disponibilidad completa del docente');
    }

    // Advertir sobre duración de la clase
    if (teachingHourUuids.length > 4) {
      warnings.push('Clase muy larga (más de 4 horas pedagógicas)');
      suggestions.push('Considerar dividir en múltiples sesiones');
    }
  }

  private checkConflicts(
    teacherUuid: string,
    learningSpaceUuid: string,
    groupUuid: string,
    dayOfWeek: string,
    teachingHourUuids: string[]
  ): Observable<ConflictCheck> {
    // Usar los endpoints de conflictos del backend
    return this.filterClassSessions({
      teacherUuid,
      learningSpaceUuid,
      studentGroupUuid: groupUuid,
      dayOfWeek
    }).pipe(
      map(response => {
        const sessions = Array.isArray(response.data) ? response.data : [response.data];

        // Verificar si alguna sesión usa las mismas horas pedagógicas
        const conflictingSessions = sessions.filter((session: ClassSession) =>
          session.teachingHours.some(hour => teachingHourUuids.includes(hour.uuid))
        );

        if (conflictingSessions.length > 0) {
          return {
            hasConflict: true,
            conflictType: this.determineConflictType(conflictingSessions),
            message: this.generateConflictMessage(conflictingSessions),
            conflictingSessions
          };
        }

        return {
          hasConflict: false,
          conflictType: 'TEACHER' as const,
          message: '',
          conflictingSessions: []
        };
      })
    );
  }

  private determineConflictType(sessions: ClassSession[]): 'TEACHER' | 'SPACE' | 'GROUP' | 'MULTIPLE' {
    // Lógica para determinar el tipo de conflicto
    return 'MULTIPLE';
  }

  private generateConflictMessage(sessions: ClassSession[]): string {
    return `Conflicto detectado con ${sessions.length} sesión(es) existente(s)`;
  }

  // Métodos auxiliares para obtener datos específicos
  private getCourseById(uuid: string): Observable<any> {
    return this.get<Course>(`/protected/courses/${uuid}`);
  }

  private getTeacherById(uuid: string): Observable<any> {
    return this.get<Teacher>(`/protected/teachers/${uuid}`);
  }

  private getLearningSpaceById(uuid: string): Observable<any> {
    return this.get<LearningSpace>(`/protected/learning-space/${uuid}`);
  }

  private getStudentGroupById(uuid: string): Observable<any> {
    return this.get<StudentGroup>(`/protected/student-groups/${uuid}`);
  }

  // === GESTIÓN DE FILTROS INTELIGENTES ===

  updateSmartFilters(filters: Partial<SmartFilters>): void {
    const currentFilters = this.smartFiltersSubject.value;
    this.smartFiltersSubject.next({ ...currentFilters, ...filters });
  }

  clearSmartFilters(): void {
    this.smartFiltersSubject.next({});
  }

  // === LIMPIEZA DE CACHÉ ===

  clearCache(): void {
    this.teachersCache.clear();
    this.spacesCache.clear();
    this.availabilityCache.clear();
  }
}
