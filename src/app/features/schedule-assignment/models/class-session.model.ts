// src/app/features/schedule-assignment/models/class-session.model.ts

// Interfaces base reutilizables
import {AssignmentDialogData} from '../components/assignment-dialog/assignment-dialog.component';

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

export interface StudentGroupResponse {
  uuid: string;
  name: string;
  cycleUuid: string;
  cycleNumber: number;
  periodUuid: string;
  periodName: string;
  careerUuid: string;
  careerName: string;
  modalityUuid?: string;
  modalityName?: string;
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

export interface ClassSessionValidation {
  courseUuid: string;
  teacherUuid: string;
  learningSpaceUuid: string;
  studentGroupUuid: string;
  dayOfWeek: string;
  teachingHourUuids: string[];
  sessionTypeUuid: string;
  sessionUuid?: string; // Para modo edición
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

// ✅ MODELO ACTUALIZADO: Una celda por hora pedagógica individual
export interface ScheduleCell {
  teachingHour: TeachingHourResponse;
  session?: ClassSessionResponse;
  isAvailable: boolean;
  isSelected?: boolean;
  conflicts?: string[];
}

// ✅ NUEVO: Modelo mejorado para filas individuales por hora pedagógica
export interface ScheduleHourRow {
  teachingHour: TeachingHourResponse;
  timeSlot: {
    uuid: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  isFirstHourOfTimeSlot: boolean; // Para mostrar el separador del turno
  isLastHourOfTimeSlot: boolean;  // Para el espaciado
  hourIndexInTimeSlot: number;    // Posición dentro del turno (0, 1, 2...)
  totalHoursInTimeSlot: number;   // Total de horas en el turno
  cells: { [key in DayOfWeek]?: ScheduleCell }; // UNA celda por día, no array
}

// ✅ MANTENER COMPATIBILIDAD: Modelo anterior (deprecated)
/** @deprecated Use ScheduleHourRow instead. This model groups multiple hours per row which causes alignment issues. */
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

export interface TeacherEligibilityResponse {
  uuid: string;
  fullName: string;
  email: string;
  department: any;
  knowledgeAreas: any[];
  hasUserAccount: boolean;
  isAvailableForTimeSlot: boolean;
  availabilityStatus: TeacherAvailabilityStatus; // ✅ CORREGIDO: Usar el tipo completo
  availabilitiesForDay: any[];
  recommendedTimeSlots: string;

  // ✅ VERIFICAR estos campos para conflictos:
  hasScheduleConflict?: boolean;
  conflictingClasses?: TeacherClassConflict[]; // ✅ USAR LA INTERFACE CORRECTA
  conflictSummary?: string;
  conflictType?: 'SAME_HOURS' | 'OVERLAPPING_HOURS' | 'ADJACENT_HOURS';
}

// ✅ NUEVO: Información detallada sobre conflictos de clases
export interface TeacherClassConflict {
  sessionUuid: string;
  courseName: string;
  courseCode: string;
  studentGroupName: string;
  studentGroupUuid: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teachingHours: TeachingHourResponse[];
  learningSpaceName: string;
  sessionType: 'THEORY' | 'PRACTICE';
  conflictingHourUuids: string[]; // Qué horas específicamente entran en conflicto
}

export type TeacherAvailabilityStatus =
  | 'AVAILABLE'              // Disponible y sin conflictos
  | 'NOT_AVAILABLE'          // No tiene horario de disponibilidad configurado
  | 'TIME_CONFLICT'          // Fuera de su horario de disponibilidad
  | 'SCHEDULE_CONFLICT'      // Tiene clase asignada en esas horas
  | 'PARTIAL_CONFLICT'       // Algunas horas en conflicto, otras disponibles
  | 'NO_SCHEDULE_CONFIGURED' // Sin horario configurado
  | 'ERROR';                 // Error al verificar

// ✅ NUEVO: Para agrupar docentes en el UI
export interface GroupedTeachers {
  available: TeacherEligibilityResponse[];
  withConflicts: TeacherEligibilityResponse[];
  unavailable: TeacherEligibilityResponse[];
  noSchedule: TeacherEligibilityResponse[];
}

// ✅ NUEVAS INTERFACES DE UTILIDAD PARA EL TABLERO MEJORADO

// Información de TimeSlot del backend
export interface TimeSlotResponse {
  uuid: string;
  name: string;
  startTime: string;
  endTime: string;
  teachingHours: TeachingHourResponse[];
}

// Información procesada para el tablero
export interface ProcessedTimeSlot extends TimeSlotResponse {
  sortedHours: TeachingHourResponse[];
  sortOrder: number; // Para ordenamiento por startTime
}

// Configuración del tablero
export interface ScheduleConfig {
  showTimeSlotNames: boolean;
  showHourNumbers: boolean;
  allowMultipleSelection: boolean;
  highlightConflicts: boolean;
  autoSave: boolean;
}

// Estado del tablero
export interface ScheduleBoardState {
  selectedCells: Set<string>; // Set de "day-hourUuid"
  hoveredCell?: string;
  draggedCell?: string;
  validationErrors: Map<string, string[]>;
  warnings: Map<string, string[]>;
}

export interface MultiCellSelection {
  selectedCells: Map<string, SelectedCellInfo>; // key: "day-hourUuid"
  isSelecting: boolean;
  selectionStart?: SelectedCellInfo;
  lastSelectedDay?: DayOfWeek;
  selectedTimeSlot?: string; // UUID del turno seleccionado
}
export interface SelectedCellInfo {
  day: DayOfWeek;
  teachingHour: TeachingHourResponse;
  timeSlotUuid: string;
  row: ScheduleHourRow;
  isAvailable: boolean;
}
export interface MultiCellAssignmentData extends AssignmentDialogData {
  selectedCells: SelectedCellInfo[];
  selectedTimeSlotUuid: string;
  consolidatedHours: TeachingHourResponse[];
}

// ✅ HELPERS Y UTILIDADES
// ✅ HELPER para manejo de selecciones
export class MultiSelectionHelper {

  /**
   * Genera clave única para una celda
   */
  static getCellKey(day: DayOfWeek, hourUuid: string): string {
    return `${day}-${hourUuid}`;
  }

  /**
   * Verifica si las celdas seleccionadas son válidas para una sesión
   */
  static validateCellSelection(cells: SelectedCellInfo[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (cells.length === 0) {
      errors.push('Debe seleccionar al menos una celda');
      return { isValid: false, errors };
    }

    // Verificar que todas las celdas estén disponibles
    const unavailableCells = cells.filter(cell => !cell.isAvailable);
    if (unavailableCells.length > 0) {
      errors.push('Algunas celdas seleccionadas no están disponibles');
    }

    // Verificar que todas las celdas sean del mismo día
    const uniqueDays = new Set(cells.map(cell => cell.day));
    if (uniqueDays.size > 1) {
      errors.push('Todas las celdas deben ser del mismo día');
    }

    // Verificar que todas las celdas sean del mismo turno
    const uniqueTimeSlots = new Set(cells.map(cell => cell.timeSlotUuid));
    if (uniqueTimeSlots.size > 1) {
      errors.push('Todas las celdas deben ser del mismo turno');
    }

    // Verificar que las horas sean consecutivas
    if (cells.length > 1) {
      const sortedCells = [...cells].sort((a, b) =>
        a.teachingHour.orderInTimeSlot - b.teachingHour.orderInTimeSlot
      );

      for (let i = 1; i < sortedCells.length; i++) {
        const prevOrder = sortedCells[i - 1].teachingHour.orderInTimeSlot;
        const currentOrder = sortedCells[i].teachingHour.orderInTimeSlot;

        if (currentOrder !== prevOrder + 1) {
          errors.push('Las horas seleccionadas deben ser consecutivas');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Consolida las horas pedagógicas seleccionadas
   */
  static consolidateTeachingHours(cells: SelectedCellInfo[]): TeachingHourResponse[] {
    return cells
      .map(cell => cell.teachingHour)
      .sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
  }

  /**
   * Obtiene el rango de tiempo de las celdas seleccionadas
   */
  static getTimeRange(cells: SelectedCellInfo[]): { start: string; end: string } | null {
    if (cells.length === 0) return null;

    const sortedHours = this.consolidateTeachingHours(cells);
    return {
      start: sortedHours[0].startTime,
      end: sortedHours[sortedHours.length - 1].endTime
    };
  }
}

// Helpers para TimeSlots
export class TimeSlotHelper {
  /**
   * Ordena TimeSlots por hora de inicio
   */
  static sortTimeSlots(timeSlots: TimeSlotResponse[]): ProcessedTimeSlot[] {
    return timeSlots
      .map((ts, index) => ({
        ...ts,
        sortedHours: [...ts.teachingHours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot),
        sortOrder: TimeSlotHelper.timeStringToMinutes(ts.startTime)
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Convierte string de tiempo a minutos para ordenamiento
   */
  static timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Verifica si dos rangos de tiempo se solapan
   */
  static timesOverlap(
    start1: string, end1: string,
    start2: string, end2: string
  ): boolean {
    const start1Min = TimeSlotHelper.timeStringToMinutes(start1);
    const end1Min = TimeSlotHelper.timeStringToMinutes(end1);
    const start2Min = TimeSlotHelper.timeStringToMinutes(start2);
    const end2Min = TimeSlotHelper.timeStringToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  }
}

// Helpers para el tablero
export class ScheduleHelper {
  /**
   * Genera clave única para una celda
   */
  static getCellKey(day: DayOfWeek, hourUuid: string): string {
    return `${day}-${hourUuid}`;
  }

  /**
   * Parsea clave de celda
   */
  static parseCellKey(key: string): { day: DayOfWeek; hourUuid: string } | null {
    const parts = key.split('-');
    if (parts.length !== 2) return null;

    const day = parts[0] as DayOfWeek;
    const hourUuid = parts[1];

    if (!Object.values(DayOfWeek).includes(day)) return null;

    return { day, hourUuid };
  }

  /**
   * Verifica si una sesión se extiende por múltiples horas
   */
  static isMultiHourSession(session: ClassSessionResponse): boolean {
    return session.teachingHours.length > 1;
  }

  /**
   * Obtiene el rango de horas de una sesión
   */
  static getSessionTimeRange(session: ClassSessionResponse): { start: string; end: string } {
    const sortedHours = [...session.teachingHours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
    return {
      start: sortedHours[0].startTime,
      end: sortedHours[sortedHours.length - 1].endTime
    };
  }
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

// ✅ CONSTANTES PARA EL TABLERO CORREGIDAS
export const SCHEDULE_CONSTANTS = {
  MIN_HOUR_DURATION: 30, // minutos
  MAX_HOUR_DURATION: 180, // minutos
  MAX_CONSECUTIVE_HOURS: 4,
  DEFAULT_BREAK_DURATION: 10, // minutos
  CELL_HEIGHT: 80, // px
  TIME_CELL_WIDTH: 220, // px - ✅ Aumentado para evitar overflow
  DAY_CELL_MIN_WIDTH: 180 // px
} as const;
