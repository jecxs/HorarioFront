// Interfaces para Departamentos Académicos
import {
  TeacherAvailabilityResponse,
  TeacherAvailabilityRequest
} from './disponibilidad.model';


export interface AcademicDepartmentResponse {
  uuid: string;
  name: string;
  code?: string;
  description?: string;
  knowledgeAreas?: KnowledgeAreaResponse[];
}

export interface AcademicDepartmentRequest {
  name: string;
  code?: string;
  description?: string;
}

// Interfaces para Áreas de Conocimiento
export interface KnowledgeAreaResponse {
  uuid: string;
  name: string;
  description?: string;
  department?: AcademicDepartmentResponse;
}

export interface KnowledgeAreaRequest {
  name: string;
  description?: string;
  departmentUuid: string;
}

// Interfaces para Docentes
export interface TeacherResponse {
  uuid: string;
  fullName: string;
  email: string;
  phone?: string;
  department: AcademicDepartmentResponse;
  knowledgeAreas: KnowledgeAreaResponse[];
  hasUserAccount: boolean;
  totalAvailabilities?: number;
}

export interface TeacherWithAvailabilitiesResponse extends TeacherResponse {
  availabilities: TeacherAvailabilityResponse[];
}

export interface TeacherRequest {
  fullName: string;
  email: string;
  phone?: string;
  departmentUuid: string;
  knowledgeAreaUuids: string[];
}

export interface TeacherUpdateRequest {
  fullName: string;
  phone?: string;
  departmentUuid: string;
  knowledgeAreaUuids: string[];
}


// Interface para Filtros de Docentes
export interface TeacherFilter {
  departmentUuid?: string;
  knowledgeAreaUuids?: string[];
  searchTerm?: string;
  hasUserAccount?: boolean;
}

// Interfaz para info de usuario (credenciales)
export interface TeacherUserInfo {
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  firstLogin: boolean;
}
