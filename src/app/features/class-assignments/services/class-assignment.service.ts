// src/app/features/class-assignments/services/class-assignment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, map, tap } from 'rxjs';

// Interfaces y tipos
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface ClassSession {
  uuid: string;
  studentGroup: StudentGroup;
  course: Course;
  teacher: Teacher;
  learningSpace: LearningSpace;
  sessionType: TeachingType;
  dayOfWeek: string;
  teachingHours: TeachingHour[];
  totalHours: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSessionRequest {
  studentGroupUuid: string;
  courseUuid: string;
  teacherUuid: string;
  learningSpaceUuid: string;
  sessionTypeUuid: string;
  dayOfWeek: string;
  teachingHourUuids: string[];
  notes?: string;
}

export interface Teacher {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  academicDepartment: AcademicDepartment;
  knowledgeAreas: KnowledgeArea[];
  availabilities: TeacherAvailability[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAvailability {
  uuid: string;
  teacher: Teacher;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
}

export interface StudentGroup {
  uuid: string;
  name: string;
  cycle: Cycle;
  period: Period;
  maxStudents: number;
  currentStudents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  uuid: string;
  code: string;
  name: string;
  cycle: Cycle;
  knowledgeArea: KnowledgeArea;
  weeklyTheoryHours: number;
  weeklyPracticeHours: number;
  totalWeeklyHours: number;
  preferredSpecialty?: Specialty;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSpace {
  uuid: string;
  name: string;
  code: string;
  capacity: number;
  teachingType: TeachingType;
  specialty?: Specialty;
  hasProjector: boolean;
  hasComputers: boolean;
  hasLaboratoryEquipment: boolean;
  isActive: boolean;
  floor: number;
  building?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  uuid: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  orderInDay: number;
}

export interface TeachingHour {
  uuid: string;
  timeSlot: TimeSlot;
  orderInTimeSlot: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isActive: boolean;
}

export interface TeachingType {
  uuid: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface AcademicDepartment {
  uuid: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface KnowledgeArea {
  uuid: string;
  name: string;
  description: string;
  academicDepartment: AcademicDepartment;
  isActive: boolean;
}

export interface Specialty {
  uuid: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Cycle {
  uuid: string;
  number: number;
  name: string;
  career: Career;
  isActive: boolean;
}

export interface Career {
  uuid: string;
  name: string;
  code: string;
  educationalModality: EducationalModality;
  durationYears: number;
  isActive: boolean;
}

export interface EducationalModality {
  uuid: string;
  name: string;
  description: string;
  durationYears: number;
  isActive: boolean;
}

export interface Period {
  uuid: string;
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  conflictType?: 'TEACHER' | 'SPACE' | 'GROUP' | 'MULTIPLE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ClassSessionFilter {
  studentGroupUuid?: string;
  courseUuid?: string;
  teacherUuid?: string;
  learningSpaceUuid?: string;
  dayOfWeek?: string;
  cycleUuid?: string;
  careerUuid?: string;
  sessionTypeUuid?: string;
  periodUuid?: string;
}

export interface IntelliSenseResult {
  eligibleTeachers: Teacher[];
  eligibleSpaces: LearningSpace[];
  availableHours: TeachingHour[];
  recommendations: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ClassAssignmentService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/v1';

  // BehaviorSubjects para manejar estado reactivo
  private readonly classSessionsSubject = new BehaviorSubject<ClassSession[]>([]);
  private readonly teachersSubject = new BehaviorSubject<Teacher[]>([]);
  private readonly studentsGroupsSubject = new BehaviorSubject<StudentGroup[]>([]);
  private readonly coursesSubject = new BehaviorSubject<Course[]>([]);
  private readonly learningSpacesSubject = new BehaviorSubject<LearningSpace[]>([]);
  private readonly timeSlotsSubject = new BehaviorSubject<TimeSlot[]>([]);
  private readonly teachingHoursSubject = new BehaviorSubject<TeachingHour[]>([]);

  // Observables públicos
  public readonly classSessions$ = this.classSessionsSubject.asObservable();
  public readonly teachers$ = this.teachersSubject.asObservable();
  public readonly studentGroups$ = this.studentsGroupsSubject.asObservable();
  public readonly courses$ = this.coursesSubject.asObservable();
  public readonly learningSpaces$ = this.learningSpacesSubject.asObservable();
  public readonly timeSlots$ = this.timeSlotsSubject.asObservable();
  public readonly teachingHours$ = this.teachingHoursSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Cargar datos iniciales de forma asíncrona
    this.getAllClassSessions().subscribe();
    this.getAllTeachers().subscribe();
    this.getAllStudentGroups().subscribe();
    this.getAllCourses().subscribe();
    this.getAllLearningSpaces().subscribe();
    this.getAllTimeSlots().subscribe();
    this.getAllTeachingHours().subscribe();
  }

  // ====== MÉTODOS PRINCIPALES PARA CLASS SESSIONS ======

  getAllClassSessions(): Observable<ApiResponse<ClassSession[]>> {
    return this.http.get<ApiResponse<ClassSession[]>>(`${this.baseUrl}/class-sessions`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.classSessionsSubject.next(response.data);
          }
        })
      );
  }

  getClassSessionById(uuid: string): Observable<ApiResponse<ClassSession>> {
    return this.http.get<ApiResponse<ClassSession>>(`${this.baseUrl}/class-sessions/${uuid}`);
  }

  createClassSession(request: ClassSessionRequest): Observable<ApiResponse<ClassSession>> {
    return this.http.post<ApiResponse<ClassSession>>(`${this.baseUrl}/class-sessions`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            const current = this.classSessionsSubject.value;
            this.classSessionsSubject.next([...current, response.data]);
          }
        })
      );
  }

  updateClassSession(uuid: string, request: ClassSessionRequest): Observable<ApiResponse<ClassSession>> {
    return this.http.put<ApiResponse<ClassSession>>(`${this.baseUrl}/class-sessions/${uuid}`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            const current = this.classSessionsSubject.value;
            const index = current.findIndex(session => session.uuid === uuid);
            if (index !== -1) {
              current[index] = response.data;
              this.classSessionsSubject.next([...current]);
            }
          }
        })
      );
  }

  deleteClassSession(uuid: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/class-sessions/${uuid}`)
      .pipe(
        tap(response => {
          if (response.success) {
            const current = this.classSessionsSubject.value;
            this.classSessionsSubject.next(current.filter(session => session.uuid !== uuid));
          }
        })
      );
  }

  getSessionsByTeacher(teacherUuid: string): Observable<ApiResponse<ClassSession[]>> {
    return this.http.get<ApiResponse<ClassSession[]>>(`${this.baseUrl}/class-sessions/teacher/${teacherUuid}`);
  }

  getSessionsByStudentGroup(groupUuid: string): Observable<ApiResponse<ClassSession[]>> {
    return this.http.get<ApiResponse<ClassSession[]>>(`${this.baseUrl}/class-sessions/student-group/${groupUuid}`);
  }

  filterClassSessions(filters: ClassSessionFilter): Observable<ApiResponse<ClassSession[]>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<ClassSession[]>>(`${this.baseUrl}/class-sessions/filter`, { params });
  }

  // ====== MÉTODOS PARA TEACHERS ======

  getAllTeachers(): Observable<ApiResponse<Teacher[]>> {
    return this.http.get<ApiResponse<Teacher[]>>(`${this.baseUrl}/teachers`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.teachersSubject.next(response.data);
          }
        })
      );
  }

  getTeacherById(uuid: string): Observable<ApiResponse<Teacher>> {
    return this.http.get<ApiResponse<Teacher>>(`${this.baseUrl}/teachers/${uuid}`);
  }

  getTeacherAvailabilities(teacherUuid: string): Observable<ApiResponse<TeacherAvailability[]>> {
    return this.http.get<ApiResponse<TeacherAvailability[]>>(`${this.baseUrl}/teachers/${teacherUuid}/availabilities`);
  }

  getEligibleTeachers(courseUuid: string, dayOfWeek?: string, timeSlotUuid?: string): Observable<ApiResponse<Teacher[]>> {
    let params = new HttpParams();
    if (dayOfWeek) params = params.set('dayOfWeek', dayOfWeek);
    if (timeSlotUuid) params = params.set('timeSlotUuid', timeSlotUuid);

    return this.http.get<ApiResponse<Teacher[]>>(`${this.baseUrl}/teachers/eligible/${courseUuid}`, { params });
  }

  // ====== MÉTODOS PARA STUDENT GROUPS ======

  getAllStudentGroups(): Observable<ApiResponse<StudentGroup[]>> {
    return this.http.get<ApiResponse<StudentGroup[]>>(`${this.baseUrl}/student-groups`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.studentsGroupsSubject.next(response.data);
          }
        })
      );
  }

  getStudentGroupById(uuid: string): Observable<ApiResponse<StudentGroup>> {
    return this.http.get<ApiResponse<StudentGroup>>(`${this.baseUrl}/student-groups/${uuid}`);
  }

  getStudentGroupsByCycle(cycleUuid: string): Observable<ApiResponse<StudentGroup[]>> {
    return this.http.get<ApiResponse<StudentGroup[]>>(`${this.baseUrl}/student-groups/cycle/${cycleUuid}`);
  }

  // ====== MÉTODOS PARA COURSES ======

  getAllCourses(): Observable<ApiResponse<Course[]>> {
    return this.http.get<ApiResponse<Course[]>>(`${this.baseUrl}/courses`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.coursesSubject.next(response.data);
          }
        })
      );
  }

  getCourseById(uuid: string): Observable<ApiResponse<Course>> {
    return this.http.get<ApiResponse<Course>>(`${this.baseUrl}/courses/${uuid}`);
  }

  getCoursesByCycle(cycleUuid: string): Observable<ApiResponse<Course[]>> {
    return this.http.get<ApiResponse<Course[]>>(`${this.baseUrl}/courses/cycle/${cycleUuid}`);
  }

  // ====== MÉTODOS PARA LEARNING SPACES ======

  getAllLearningSpaces(): Observable<ApiResponse<LearningSpace[]>> {
    return this.http.get<ApiResponse<LearningSpace[]>>(`${this.baseUrl}/learning-spaces`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.learningSpacesSubject.next(response.data);
          }
        })
      );
  }

  getLearningSpaceById(uuid: string): Observable<ApiResponse<LearningSpace>> {
    return this.http.get<ApiResponse<LearningSpace>>(`${this.baseUrl}/learning-spaces/${uuid}`);
  }

  getEligibleSpaces(courseUuid: string, dayOfWeek?: string, timeSlotUuid?: string): Observable<ApiResponse<LearningSpace[]>> {
    let params = new HttpParams();
    if (dayOfWeek) params = params.set('dayOfWeek', dayOfWeek);
    if (timeSlotUuid) params = params.set('timeSlotUuid', timeSlotUuid);

    return this.http.get<ApiResponse<LearningSpace[]>>(`${this.baseUrl}/learning-spaces/eligible/${courseUuid}`, { params });
  }

  // ====== MÉTODOS PARA TIME SLOTS Y TEACHING HOURS ======

  getAllTimeSlots(): Observable<ApiResponse<TimeSlot[]>> {
    return this.http.get<ApiResponse<TimeSlot[]>>(`${this.baseUrl}/time-slots`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.timeSlotsSubject.next(response.data);
          }
        })
      );
  }

  getAllTeachingHours(): Observable<ApiResponse<TeachingHour[]>> {
    return this.http.get<ApiResponse<TeachingHour[]>>(`${this.baseUrl}/teaching-hours`)
      .pipe(
        tap(response => {
          if (response.success && Array.isArray(response.data)) {
            this.teachingHoursSubject.next(response.data);
          }
        })
      );
  }

  getTeachingHoursByTimeSlot(timeSlotUuid: string): Observable<ApiResponse<TeachingHour[]>> {
    return this.http.get<ApiResponse<TeachingHour[]>>(`${this.baseUrl}/teaching-hours/time-slot/${timeSlotUuid}`);
  }

  getAvailableTeachingHours(
    teacherUuid: string,
    spaceUuid: string,
    groupUuid: string,
    dayOfWeek: string
  ): Observable<TeachingHour[]> {
    let params = new HttpParams()
      .set('teacherUuid', teacherUuid)
      .set('spaceUuid', spaceUuid)
      .set('groupUuid', groupUuid)
      .set('dayOfWeek', dayOfWeek);

    return this.http.get<ApiResponse<TeachingHour[]>>(`${this.baseUrl}/teaching-hours/available`, { params })
      .pipe(
        map(response => Array.isArray(response.data) ? response.data : [])
      );
  }

  // ====== MÉTODOS PARA VALIDACIÓN E INTELLISENSE ======

  validateAssignmentInRealTime(
    courseUuid: string,
    teacherUuid: string,
    spaceUuid: string,
    groupUuid: string,
    dayOfWeek: string,
    teachingHourUuids: string[]
  ): Observable<ValidationResult> {
    const request = {
      courseUuid,
      teacherUuid,
      spaceUuid,
      groupUuid,
      dayOfWeek,
      teachingHourUuids
    };

    return this.http.post<ValidationResult>(`${this.baseUrl}/class-sessions/validate`, request);
  }

  getIntelliSense(
    courseUuid?: string,
    groupUuid?: string,
    dayOfWeek?: string,
    timeSlotUuid?: string
  ): Observable<IntelliSenseResult> {
    let params = new HttpParams();
    if (courseUuid) params = params.set('courseUuid', courseUuid);
    if (groupUuid) params = params.set('groupUuid', groupUuid);
    if (dayOfWeek) params = params.set('dayOfWeek', dayOfWeek);
    if (timeSlotUuid) params = params.set('timeSlotUuid', timeSlotUuid);

    return this.http.get<IntelliSenseResult>(`${this.baseUrl}/class-sessions/intellisense`, { params });
  }

  checkConflicts(sessionData: ClassSessionRequest): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.baseUrl}/class-sessions/check-conflicts`, sessionData);
  }

  // ====== MÉTODOS PARA TEACHING TYPES Y OTRAS ENTIDADES ======

  getAllTeachingTypes(): Observable<ApiResponse<TeachingType[]>> {
    return this.http.get<ApiResponse<TeachingType[]>>(`${this.baseUrl}/teaching-types`);
  }

  getAllAcademicDepartments(): Observable<ApiResponse<AcademicDepartment[]>> {
    return this.http.get<ApiResponse<AcademicDepartment[]>>(`${this.baseUrl}/academic-departments`);
  }

  getAllKnowledgeAreas(): Observable<ApiResponse<KnowledgeArea[]>> {
    return this.http.get<ApiResponse<KnowledgeArea[]>>(`${this.baseUrl}/knowledge-areas`);
  }

  getKnowledgeAreasByDepartment(departmentUuid: string): Observable<ApiResponse<KnowledgeArea[]>> {
    return this.http.get<ApiResponse<KnowledgeArea[]>>(`${this.baseUrl}/knowledge-areas/department/${departmentUuid}`);
  }

  getAllSpecialties(): Observable<ApiResponse<Specialty[]>> {
    return this.http.get<ApiResponse<Specialty[]>>(`${this.baseUrl}/specialties`);
  }

  getAllCycles(): Observable<ApiResponse<Cycle[]>> {
    return this.http.get<ApiResponse<Cycle[]>>(`${this.baseUrl}/cycles`);
  }

  getAllCareers(): Observable<ApiResponse<Career[]>> {
    return this.http.get<ApiResponse<Career[]>>(`${this.baseUrl}/careers`);
  }

  getAllPeriods(): Observable<ApiResponse<Period[]>> {
    return this.http.get<ApiResponse<Period[]>>(`${this.baseUrl}/periods`);
  }

  getCurrentPeriod(): Observable<ApiResponse<Period>> {
    return this.http.get<ApiResponse<Period>>(`${this.baseUrl}/periods/current`);
  }

  // ====== MÉTODOS UTILITARIOS ======

  /**
   * Obtiene sesiones filtradas por múltiples criterios
   */
  getFilteredSessions(filters: ClassSessionFilter): Observable<ClassSession[]> {
    return combineLatest([
      this.classSessions$,
      this.filterClassSessions(filters)
    ]).pipe(
      map(([allSessions, filteredResponse]) => {
        if (filteredResponse.success && Array.isArray(filteredResponse.data)) {
          return filteredResponse.data;
        }
        return allSessions;
      })
    );
  }

  /**
   * Obtiene estadísticas del horario actual
   */
  getScheduleStatistics(): Observable<any> {
    return this.classSessions$.pipe(
      map(sessions => {
        const totalSessions = sessions.length;
        const totalHours = sessions.reduce((sum, session) => sum + session.totalHours, 0);

        const teachersCount = new Set(sessions.map(s => s.teacher.uuid)).size;
        const spacesCount = new Set(sessions.map(s => s.learningSpace.uuid)).size;
        const groupsCount = new Set(sessions.map(s => s.studentGroup.uuid)).size;

        const theoryHours = sessions
          .filter(s => s.sessionType.name === 'THEORY')
          .reduce((sum, session) => sum + session.totalHours, 0);

        const practiceHours = sessions
          .filter(s => s.sessionType.name === 'PRACTICE')
          .reduce((sum, session) => sum + session.totalHours, 0);

        return {
          totalSessions,
          totalHours,
          averageSessionDuration: totalSessions > 0 ? totalHours / totalSessions : 0,
          theoryPercentage: totalHours > 0 ? (theoryHours / totalHours) * 100 : 0,
          practicePercentage: totalHours > 0 ? (practiceHours / totalHours) * 100 : 0,
          teachersCount,
          spacesCount,
          groupsCount
        };
      })
    );
  }

  /**
   * Refresca todos los datos
   */
  refreshAllData(): void {
    this.loadInitialData();
  }

  /**
   * Limpia el caché de datos
   */
  clearCache(): void {
    this.classSessionsSubject.next([]);
    this.teachersSubject.next([]);
    this.studentsGroupsSubject.next([]);
    this.coursesSubject.next([]);
    this.learningSpacesSubject.next([]);
    this.timeSlotsSubject.next([]);
    this.teachingHoursSubject.next([]);
  }
}
