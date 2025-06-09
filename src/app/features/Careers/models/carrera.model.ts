// src/app/features/carreras/models/carrera.model.ts

// Interfaces para Ciclos
export interface CycleResponse {
  uuid: string;
  number: number;
  career?: CareerResponse; // Opcional para evitar referencia circular
}

// Interfaces para Modalidades (reutilizada)
export interface EducationalModalityResponse {
  uuid: string;
  name: string;
  durationYears: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interfaces para Carreras
export interface CareerRequest {
  name: string;
  modalityId: string; // UUID de la modalidad
}

export interface CareerResponse {
  uuid: string;
  name: string;
  modality: EducationalModalityResponse;
  cycles: CycleResponse[];
}

// Interface para respuesta de API

// Interface para filtros
export interface CareerFilter {
  modalityId?: string;
  searchTerm?: string;
}
