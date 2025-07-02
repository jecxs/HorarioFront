// src/app/features/courses/services/course.service.ts
import { Injectable } from '@angular/core';
import {map, Observable, tap} from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';
import {catchError} from 'rxjs/operators';

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

export interface CourseRequest {
  name: string;
  code: string;
  cycleUuid: string;
  knowledgeAreaUuid: string;
  weeklyTheoryHours: number;
  weeklyPracticeHours: number;
  preferredSpecialtyUuid?: string;
  teachingTypeUuids: string[];
}

export interface TeachingType {
  uuid: string;
  name: string; // 'THEORY' | 'PRACTICE'
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
  description?: string;
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
  career: Career;
}

export interface Career {
  uuid: string;
  name: string;
  modality: EducationalModality;
  cycles?: Cycle[]; // Para la navegación jerárquica
}

export interface EducationalModality {
  uuid: string;
  name: string;
  durationYears: number;
  description?: string;
}

export interface CourseFilters {
  modalityUuid?: string;
  careerUuid?: string;
  cycleUuid?: string;
  knowledgeAreaUuid?: string;
  courseName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService extends BaseApiService {

  // === COURSES ===

  // Obtener todos los cursos
  getAllCourses(): Observable<any> {
    return this.get<Course[]>('/protected/courses');
  }

  // Obtener curso por ID
  getCourseById(uuid: string): Observable<any> {
    return this.get<Course>(`/protected/courses/${uuid}`);
  }

  // Crear un nuevo curso
  createCourse(course: CourseRequest): Observable<any> {
    return this.post<Course>('/protected/courses', course);
  }

  // Actualizar un curso
  updateCourse(uuid: string, course: CourseRequest): Observable<any> {
    return this.put<Course>(`/protected/courses/${uuid}`, course);
  }

  // Filtrar cursos
  filterCourses(filters: CourseFilters): Observable<any> {
    const params = this.createParams(filters);
    return this.get<Course[]>('/protected/courses/filter', params);
  }

  // Obtener cursos por área de conocimiento
  getCoursesByKnowledgeArea(knowledgeAreaUuid: string): Observable<any> {
    return this.get<Course[]>(`/protected/courses/knowledge-area/${knowledgeAreaUuid}`);
  }

  // === TEACHING TYPES ===

  // Obtener todos los tipos de enseñanza
  getAllTeachingTypes(): Observable<any> {
    return this.get<TeachingType[]>('/protected/teaching-types');
  }

  // Obtener tipo de enseñanza por ID
  getTeachingTypeById(uuid: string): Observable<any> {
    return this.get<TeachingType>(`/protected/teaching-types/${uuid}`);
  }

  // === KNOWLEDGE AREAS ===

  // Obtener todas las áreas de conocimiento
  getAllKnowledgeAreas(): Observable<any> {
    return this.get<KnowledgeArea[]>('/protected/knowledge-areas');
  }

  // Obtener áreas de conocimiento por departamento
  getKnowledgeAreasByDepartment(departmentUuid: string): Observable<any> {
    return this.get<KnowledgeArea[]>(`/protected/knowledge-areas/department/${departmentUuid}`);
  }

  // === DEPARTMENTS ===

  // Obtener todos los departamentos académicos
  getAllDepartments(): Observable<any> {
    return this.get<AcademicDepartment[]>('/protected/academic-departments');
  }

  // === SPECIALTIES ===

  // Obtener todas las especialidades de espacios de aprendizaje
  getAllSpecialties(): Observable<any> {
    return this.get<LearningSpaceSpecialty[]>('/protected/learning-space-specialties');
  }

  // === MODALITIES ===

  // Obtener todas las modalidades educativas
  getAllModalities(): Observable<any> {
    return this.get<EducationalModality[]>('/protected/educational-modalities');
  }

  // === CAREERS ===

  // Obtener todas las carreras
  getAllCareers(): Observable<any> {
    console.log('🌐 Realizando petición: getAllCareers');
    return this.get<Career[]>('/protected/career').pipe(
      tap(response => {
        console.log('📥 Respuesta cruda de getAllCareers:', response);
        if (response.data) {
          const careers = Array.isArray(response.data) ? response.data : [response.data];
          console.log(`📚 Carreras procesadas (${careers.length}):`, careers);

          careers.forEach((career, index) => {
            console.log(`🔍 Carrera ${index + 1}:`, {
              name: career.name,
              uuid: career.uuid,
              modality: career.modality?.name,
              cyclesCount: career.cycles?.length || 0,
              cycles: career.cycles
            });
          });
        }
      }),
      catchError(error => {
        console.error('❌ Error en getAllCareers:', error);
        throw error;
      })
    );
  }

  // ✅ NUEVO MÉTODO: Para verificar datos específicos
  getCareerWithCycles(careerUuid: string): Observable<any> {
    console.log('🔍 Obteniendo carrera específica:', careerUuid);
    return this.getAllCareers().pipe(
      map(response => {
        const careers = Array.isArray(response.data) ? response.data : [response.data];
        const career = careers.find((c: any) => c.uuid === careerUuid);

        if (career) {
          console.log('✅ Carrera encontrada:', career);
          console.log('🔁 Ciclos de la carrera:', career.cycles);
        } else {
          console.warn('⚠️ Carrera no encontrada:', careerUuid);
        }

        return career;
      })
    );
  }



  // === UTILITY METHODS ===

  // Validar código único de curso
  validateCourseCode(code: string, excludeUuid?: string): Observable<boolean> {
    return new Observable(observer => {
      this.getAllCourses().subscribe({
        next: (response) => {
          const courses = Array.isArray(response.data) ? response.data : [response.data];
          const codeExists = courses.some((course: Course) =>
            course.code.toLowerCase() === code.toLowerCase() &&
            course.uuid !== excludeUuid
          );
          observer.next(!codeExists);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  // Calcular horas totales semanales
  calculateTotalWeeklyHours(theoryHours: number, practiceHours: number): number {
    return (theoryHours || 0) + (practiceHours || 0);
  }

  // Determinar tipo de curso basado en horas
  getCourseType(theoryHours: number, practiceHours: number): string {
    const hasTheory = theoryHours > 0;
    const hasPractice = practiceHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'UNKNOWN';
  }

  // Obtener tipos de enseñanza requeridos basado en horas
  getRequiredTeachingTypes(theoryHours: number, practiceHours: number, teachingTypes: TeachingType[]): string[] {
    const required = [];

    if (theoryHours > 0) {
      const theoryType = teachingTypes.find(t => t.name === 'THEORY');
      if (theoryType) required.push(theoryType.uuid);
    }

    if (practiceHours > 0) {
      const practiceType = teachingTypes.find(t => t.name === 'PRACTICE');
      if (practiceType) required.push(practiceType.uuid);
    }

    return required;
  }
}
