// src/app/features/docentes/models/disponibilidad.model.ts

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface TeacherAvailabilityRequest {
  dayOfWeek: DayOfWeek;
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
}

export interface TeacherAvailabilityResponse {
  uuid: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // Format: "HH:mm:ss"
  endTime: string;   // Format: "HH:mm:ss"
}

// Utilidades para trabajar con días de la semana
export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo'
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'LUN',
  TUESDAY: 'MAR',
  WEDNESDAY: 'MIE',
  THURSDAY: 'JUE',
  FRIDAY: 'VIE',
  SATURDAY: 'SAB',
  SUNDAY: 'DOM'
};

export const ORDERED_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];
