// src/app/features/learning-spaces/services/learning-space.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';

export interface LearningSpace {
  uuid: string;
  name: string;
  capacity: number;
  teachingType: {
    uuid: string;
    name: string; // 'THEORY' | 'PRACTICE'
  };
  specialty?: {
    uuid: string;
    name: string;
    description?: string;
    department?: {
      uuid: string;
      name: string;
      code?: string;
    };
  };
}

export interface LearningSpaceRequest {
  name: string;
  capacity: number;
  typeUUID: string; // UUID del TeachingType
  specialtyUuid?: string; // Solo si es PRACTICE
}

export interface TeachingType {
  uuid: string;
  name: string; // 'THEORY' | 'PRACTICE'
}

export interface LearningSpaceSpecialty {
  uuid: string;
  name: string;
  description?: string;
  department?: {
    uuid: string;
    name: string;
    code?: string;
  };
}

export interface AcademicDepartment {
  uuid: string;
  name: string;
  code?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LearningSpaceService extends BaseApiService {

  // === LEARNING SPACES ===

  // Obtener todos los espacios de aprendizaje
  getAllLearningSpaces(): Observable<any> {
    return this.get<LearningSpace[]>('/protected/learning-space');
  }

  // Crear un nuevo espacio de aprendizaje
  createLearningSpace(space: LearningSpaceRequest): Observable<any> {
    return this.post<LearningSpace>('/protected/learning-space', space);
  }

  // Actualizar un espacio de aprendizaje
  updateLearningSpace(uuid: string, space: LearningSpaceRequest): Observable<any> {
    return this.patch<LearningSpace>(`/protected/learning-space/${uuid}`, space);
  }

  // Eliminar un espacio de aprendizaje
  deleteLearningSpace(uuid: string): Observable<any> {
    return this.delete<void>(`/protected/learning-space/${uuid}`);
  }

  // === TEACHING TYPES ===

  // Obtener todos los tipos de enseñanza (THEORY/PRACTICE)
  getAllTeachingTypes(): Observable<any> {
    return this.get<TeachingType[]>('/protected/teaching-types');
  }

  // === SPECIALTIES ===

  // Obtener todas las especialidades de espacios de aprendizaje
  getAllSpecialties(): Observable<any> {
    return this.get<LearningSpaceSpecialty[]>('/protected/learning-space-specialties');
  }

  // Crear una nueva especialidad
  createSpecialty(specialty: Omit<LearningSpaceSpecialty, 'uuid'>): Observable<any> {
    return this.post<LearningSpaceSpecialty>('/protected/learning-space-specialties', specialty);
  }

  // Actualizar una especialidad
  updateSpecialty(uuid: string, specialty: Omit<LearningSpaceSpecialty, 'uuid'>): Observable<any> {
    return this.put<LearningSpaceSpecialty>(`/protected/learning-space-specialties/${uuid}`, specialty);
  }

  // Eliminar una especialidad
  deleteSpecialty(uuid: string): Observable<any> {
    return this.delete<void>(`/protected/learning-space-specialties/${uuid}`);
  }

  // === DEPARTMENTS ===

  // Obtener todos los departamentos académicos
  getAllDepartments(): Observable<any> {
    return this.get<AcademicDepartment[]>('/protected/academic-departments');
  }

  // === UTILITY METHODS ===

  // Filtrar espacios por tipo de enseñanza
  getSpacesByType(type: 'THEORY' | 'PRACTICE'): Observable<any> {
    // Esta funcionalidad puede implementarse en el frontend filtrando
    // o si tienes un endpoint específico en el backend
    return this.getAllLearningSpaces();
  }

  // Filtrar espacios por capacidad mínima
  getSpacesByMinCapacity(capacity: number): Observable<any> {
    // Similar al anterior, puede implementarse filtrando en frontend
    return this.getAllLearningSpaces();
  }

  // Verificar si un nombre de espacio ya existe
  checkSpaceNameExists(name: string): Observable<any> {
    // Esto se implementaría en el frontend verificando la lista actual
    // o si tienes un endpoint específico para verificación
    return this.getAllLearningSpaces();
  }
}
