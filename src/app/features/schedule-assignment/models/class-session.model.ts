// src/app/features/schedule-assignment/models/class-session.model.ts

// Interfaces base reutilizables
export interface BaseUuidEntity {
  uuid: string;
  name?: string;
}

// Modelos para las respuestas del backend
export interface ClassSessionResponse {
  uuid: string;
  studentGroup: StudentGroupResponse;
  course: CourseResponse;
  teacher: TeacherResponse;
  learningSpace: LearningSpaceResponse;
  dayOfWeek: DayOfWeek;
  sessionType: TeachingTypeResponse;
  teachingHours: TeachingHourResponse[];
  notes?: string;
  totalHours: number;
  timeSlotName: string;
}

export interface ClassSessionRequest {
  studentGroupUuid: string;
  courseUuid: string;
  teacherUuid: string;
  learningSpaceUuid: string;
  dayOfWeek: DayOfWeek;
  sessionTypeUuid: string;
  teachingHourUuids: string[];
  notes?: string;
}

// Enums
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

// Modelos relacionados
export interface TeacherResponse {
  uuid: string;
  fullName: string;
  email: string;
  phone?: string;
  department: BaseUuidEntity;
  knowledgeAreas: BaseUuidEntity[];
  hasUserAccount: boolean;
  totalAvailabilities?: number;
}

export interface CourseResponse {
  uuid: string;
  name: string;
  code: string;
  weeklyTheoryHours: number;
  weeklyPracticeHours: number;
  teachingTypes: TeachingTypeResponse[];
  teachingKnowledgeArea: BaseUuidEntity;
  preferredSpecialty?: BaseUuidEntity;
  cycle: CycleResponse;
  career: BaseUuidEntity;
  modality: BaseUuidEntity;
}

// ✅ MODELO CORREGIDO (COMPLETO)
export interface StudentGroupResponse {
  uuid: string;
  name: string;
  cycleUuid: string;
  cycleNumber: number;
  periodUuid: string;
  periodName: string;
  // ✅ AGREGAR: Información de la carrera
  careerUuid: string;        // UUID de la carrera
  careerName: string;        // Nombre de la carrera (opcional, para mostrar)
  modalityUuid?: string;     // UUID de la modalidad (opcional)
  modalityName?: string;     // Nombre de la modalidad (opcional)
}

export interface LearningSpaceResponse {
  uuid: string;
  name: string;
  capacity: number;
  teachingType: TeachingTypeResponse;
  specialty?: BaseUuidEntity;
}

export interface TeachingTypeResponse {
  uuid: string;
  name: string;
}

export interface TeachingHourResponse {
  uuid: string;
  orderInTimeSlot: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface CycleResponse {
  uuid: string;
  number: number;
  career?: BaseUuidEntity;
}

// Interfaces para IntelliSense
export interface IntelliSenseResponse {
  eligibleTeachers?: TeacherResponse[];
  eligibleSpaces?: LearningSpaceResponse[];
  availableHours?: TeachingHourResponse[];
  recommendations?: string[];
  warnings?: string[];
}

// Interfaces para validación
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  conflictType?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// 2. ✅ Actualizar el modelo ClassSessionValidation
export interface ClassSessionValidation {
  courseUuid: string;
  teacherUuid: string;
  learningSpaceUuid: string;
  studentGroupUuid: string;
  dayOfWeek: string;
  teachingHourUuids: string[];
  sessionUuid?: string; // ✅ AGREGAR para modo edición
}

// Filtros
export interface ClassSessionFilter {
  studentGroupUuid?: string;
  courseUuid?: string;
  teacherUuid?: string;
  learningSpaceUuid?: string;
  dayOfWeek?: DayOfWeek;
  cycleUuid?: string;
  careerUuid?: string;
  sessionTypeUuid?: string;
}

// Modelo para el tablero de horarios
export interface ScheduleCell {
  teachingHour: TeachingHourResponse;
  session?: ClassSessionResponse;
  isAvailable: boolean;
  isSelected?: boolean;
  conflicts?: string[];
}

export interface ScheduleRow {
  timeSlot: {
    uuid: string;
    name: string;
    teachingHours: TeachingHourResponse[];
  };
  cells: { [key in DayOfWeek]?: ScheduleCell[] };
}

// Modelo para el estado de la asignación
export interface AssignmentState {
  mode: 'BY_TEACHER' | 'BY_GROUP' | 'BY_COURSE';
  selectedTeacher?: TeacherResponse;
  selectedGroup?: StudentGroupResponse;
  selectedCourse?: CourseResponse;
  selectedPeriod?: string;
  currentWeek?: Date;
}

// models/class-session.model.ts
export interface TeacherEligibilityResponse {
  uuid: string;
  fullName: string;
  email: string;
  department: any;
  knowledgeAreas: any[];
  hasUserAccount: boolean;
  isAvailableForTimeSlot: boolean;
  availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'TIME_CONFLICT' | 'NO_SCHEDULE_CONFIGURED' | 'ERROR';
  availabilitiesForDay: any[];
  recommendedTimeSlots: string;
}

// Helpers
export const DAY_NAMES: { [key in DayOfWeek]: string } = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo'
};

export const WORKING_DAYS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY
];
