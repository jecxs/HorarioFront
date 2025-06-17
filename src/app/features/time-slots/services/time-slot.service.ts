// src/app/features/time-slots/services/time-slot.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';

export interface TeachingHour {
  uuid: string;
  orderInTimeSlot: number;
  startTime: string; // formato "HH:mm"
  endTime: string;   // formato "HH:mm"
  durationMinutes: number;
}

export interface TimeSlot {
  uuid: string;
  name: string;
  startTime: string; // formato "HH:mm"
  endTime: string;   // formato "HH:mm"
  teachingHours: TeachingHour[];
}

export interface TimeSlotRequest {
  name: string;
  startTime: string; // formato "HH:mm"
  endTime: string;   // formato "HH:mm"
  pedagogicalHourDurationInMinutes: number;
}

export interface TimeSlotValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalDuration: number;
  calculatedHours: number;
  suggestedDurations?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class TimeSlotService extends BaseApiService {

  // === CRUD OPERATIONS ===

  getAllTimeSlots(): Observable<any> {
    return this.get<TimeSlot[]>('/protected/timeslots');
  }

  getTimeSlotById(id: string): Observable<any> {
    return this.get<TimeSlot>(`/protected/timeslots/${id}`);
  }

  createTimeSlot(timeSlot: TimeSlotRequest): Observable<any> {
    return this.post<TimeSlot>('/protected/timeslots', timeSlot);
  }

  updateTimeSlot(id: string, timeSlot: TimeSlotRequest): Observable<any> {
    return this.put<TimeSlot>(`/protected/timeslots/${id}`, timeSlot);
  }

  deleteTimeSlot(id: string): Observable<any> {
    return this.delete<void>(`/protected/timeslots/${id}`);
  }

  // === UTILITY METHODS ===

  /**
   * Valida los datos de un turno antes de enviarlo al backend
   */
  validateTimeSlot(timeSlotData: Partial<TimeSlotRequest>): TimeSlotValidation {
    const validation: TimeSlotValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      totalDuration: 0,
      calculatedHours: 0
    };

    if (!timeSlotData.name || timeSlotData.name.trim().length === 0) {
      validation.errors.push('El nombre del turno es obligatorio');
      validation.isValid = false;
    }

    if (!timeSlotData.startTime || !timeSlotData.endTime) {
      validation.errors.push('Las horas de inicio y fin son obligatorias');
      validation.isValid = false;
      return validation;
    }

    if (!timeSlotData.pedagogicalHourDurationInMinutes || timeSlotData.pedagogicalHourDurationInMinutes <= 0) {
      validation.errors.push('La duración de la hora pedagógica debe ser mayor que 0');
      validation.isValid = false;
      return validation;
    }

    // Validar formato de horas
    if (!this.isValidTimeFormat(timeSlotData.startTime) || !this.isValidTimeFormat(timeSlotData.endTime)) {
      validation.errors.push('El formato de las horas debe ser HH:mm');
      validation.isValid = false;
      return validation;
    }

    // Calcular duración total
    const totalMinutes = this.calculateDurationInMinutes(timeSlotData.startTime, timeSlotData.endTime);

    if (totalMinutes <= 0) {
      validation.errors.push('La hora de fin debe ser posterior a la hora de inicio');
      validation.isValid = false;
      return validation;
    }

    validation.totalDuration = totalMinutes;

    // Validar que las horas pedagógicas encajen exactamente
    const remainder = totalMinutes % timeSlotData.pedagogicalHourDurationInMinutes;
    validation.calculatedHours = Math.floor(totalMinutes / timeSlotData.pedagogicalHourDurationInMinutes);

    if (remainder !== 0) {
      validation.errors.push(
        `La duración total (${totalMinutes} min) no es divisible exactamente por la duración de la hora pedagógica (${timeSlotData.pedagogicalHourDurationInMinutes} min). ` +
        `Sobran ${remainder} minutos.`
      );
      validation.isValid = false;

      // Sugerir duraciones que encajen
      validation.suggestedDurations = this.getSuggestedDurations(totalMinutes);
    }

    // Validaciones adicionales
    if (validation.calculatedHours > 8) {
      validation.warnings.push('Un turno con más de 8 horas pedagógicas puede ser muy extenso');
    }

    if (validation.calculatedHours === 1) {
      validation.warnings.push('Un turno con solo 1 hora pedagógica puede ser muy corto para ser práctico');
    }

    return validation;
  }

  /**
   * Obtiene sugerencias de duraciones que encajen en el tiempo total
   */
  getSuggestedDurations(totalMinutes: number): number[] {
    const commonDurations = [30, 40, 45, 50, 60, 90, 120];
    return commonDurations.filter(duration => totalMinutes % duration === 0);
  }

  /**
   * Calcula la duración en minutos entre dos horas
   */
  calculateDurationInMinutes(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (end <= start) {
      return 0; // o podríamos asumir que cruza medianoche
    }

    return end - start;
  }

  /**
   * Convierte una hora en formato HH:mm a minutos desde medianoche
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convierte minutos desde medianoche a formato HH:mm
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Valida el formato de hora HH:mm
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Genera una vista previa de las horas pedagógicas que se crearían
   */
  generateTeachingHoursPreview(timeSlotData: TimeSlotRequest): TeachingHour[] {
    const validation = this.validateTimeSlot(timeSlotData);

    if (!validation.isValid || validation.calculatedHours === 0) {
      return [];
    }

    const hours: TeachingHour[] = [];
    let currentMinutes = this.timeToMinutes(timeSlotData.startTime);

    for (let i = 1; i <= validation.calculatedHours; i++) {
      const startTime = this.minutesToTime(currentMinutes);
      const endTime = this.minutesToTime(currentMinutes + timeSlotData.pedagogicalHourDurationInMinutes);

      hours.push({
        uuid: `preview-${i}`, // UUID temporal para preview
        orderInTimeSlot: i,
        startTime,
        endTime,
        durationMinutes: timeSlotData.pedagogicalHourDurationInMinutes
      });

      currentMinutes += timeSlotData.pedagogicalHourDurationInMinutes;
    }

    return hours;
  }

  /**
   * Verifica si un turno se solapa con otros existentes
   */
  checkTimeSlotOverlap(timeSlotData: TimeSlotRequest, existingTimeSlots: TimeSlot[], excludeId?: string): boolean {
    const newStart = this.timeToMinutes(timeSlotData.startTime);
    const newEnd = this.timeToMinutes(timeSlotData.endTime);

    return existingTimeSlots
      .filter(slot => slot.uuid !== excludeId)
      .some(slot => {
        const existingStart = this.timeToMinutes(slot.startTime);
        const existingEnd = this.timeToMinutes(slot.endTime);

        // Verificar solapamiento
        return (newStart < existingEnd && newEnd > existingStart);
      });
  }

  /**
   * Obtiene estadísticas de los turnos
   */


  getTimeSlotStats(timeSlots: TimeSlot[]): {
    totalSlots: number;
    totalTeachingHours: number;
    averageHoursPerSlot: number;
    totalDailyMinutes: number;
    commonDurations: { duration: number; count: number }[];
  } {
    if (timeSlots.length === 0) {
      return {
        totalSlots: 0,
        totalTeachingHours: 0,
        averageHoursPerSlot: 0,
        totalDailyMinutes: 0,
        commonDurations: []
      };
    }

    const totalTeachingHours = timeSlots.reduce((sum, slot) => sum + slot.teachingHours.length, 0);
    const totalDailyMinutes = timeSlots.reduce((sum, slot) => {
      return sum + this.calculateDurationInMinutes(slot.startTime, slot.endTime);
    }, 0);

    // Agrupar por duración de hora pedagógica
    const durationCounts = new Map<number, number>();
    timeSlots.forEach(slot => {
      slot.teachingHours.forEach(hour => {
        const count = durationCounts.get(hour.durationMinutes) || 0;
        durationCounts.set(hour.durationMinutes, count + 1);
      });
    });

    const commonDurations = Array.from(durationCounts.entries())
      .map(([duration, count]) => ({ duration, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSlots: timeSlots.length,
      totalTeachingHours,
      averageHoursPerSlot: Math.round((totalTeachingHours / timeSlots.length) * 100) / 100,
      totalDailyMinutes,
      commonDurations
    };
  }
}
