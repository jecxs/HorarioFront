// src/app/features/schedule-assignment/models/teacher-metadata.model.ts
import { ClassSessionResponse, TeacherResponse } from './class-session.model';

export interface TeacherScheduleMetadata {
  teacher: TeacherResponse;
  totalAssignedHours: number;
  totalSessions: number;
  sessionsByDay: { [day: string]: ClassSessionResponse[] };
  workloadPercentage: number; // Basado en horas disponibles vs asignadas
  availabilityHours: number; // Horas totales de disponibilidad por semana
  utilizationRate: number; // Porcentaje de utilización de disponibilidad
  lastUpdated: Date;
}

export interface TeacherAssignmentStats {
  totalAvailableHours: number;
  totalAssignedHours: number;
  utilizationPercentage: number;
  sessionsByType: {
    theory: number;
    practice: number;
  };
  hoursByType: {
    theory: number;
    practice: number;
  };
}
