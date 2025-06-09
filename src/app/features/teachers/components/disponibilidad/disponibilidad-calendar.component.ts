// src/app/features/docentes/components/disponibilidad/disponibilidad-calendar.component.ts
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { formatTimeDisplay } from '../../utils/time.utils';

import {
  TeacherAvailabilityResponse,
  DayOfWeek,
  DAYS_OF_WEEK,
  getDayName
} from '../../models/disponibilidad.model';

interface TimeSlot {
  time: string;
  displayTime: string;
  hour: number;
}

interface DaySlot {
  day: DayOfWeek;
  dayName: string;
  timeSlots: CalendarTimeSlot[];
}

interface CalendarTimeSlot extends TimeSlot {
  availabilities: TeacherAvailabilityResponse[];
  hasAvailability: boolean;
}

@Component({
  selector: 'app-disponibilidad-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTooltipModule
  ],
  template: `
    <div class="calendar-view">
      <div class="calendar-container">
        <!-- Columna de horas -->
        <div class="time-column">
          <div class="header-cell">Hora</div>
          <div *ngFor="let timeSlot of timeSlots" class="time-cell">
            {{ timeSlot.displayTime }}
          </div>
        </div>

        <!-- Columnas por día -->
        <div *ngFor="let daySlot of daySlots" class="day-column">
          <div class="header-cell">{{ daySlot.dayName }}</div>
          <!-- CORREGIDO: Ahora usa daySlot.timeSlots en lugar de timeSlot -->
          <div *ngFor="let calendarSlot of daySlot.timeSlots" class="time-cell">
            <div
              class="availability-slot"
              [class.available]="calendarSlot.hasAvailability"
              [class.empty]="!calendarSlot.hasAvailability"
              [matTooltip]="getSlotTooltip(calendarSlot, daySlot.day)">
              <div *ngIf="calendarSlot.hasAvailability" class="availability-indicator"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="calendar-legend">
        <div class="legend-item">
          <div class="legend-color available"></div>
          <span>Disponible</span>
        </div>
        <div class="legend-item">
          <div class="legend-color empty"></div>
          <span>No disponible</span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./disponibilidad-calendar.component.scss']
})
export class DisponibilidadCalendarComponent implements OnInit, OnChanges {
  @Input() availabilities: TeacherAvailabilityResponse[] = [];
  @Input() readOnly: boolean = false;

  daySlots: DaySlot[] = [];
  timeSlots: TimeSlot[] = [];

  constructor() {}

  ngOnInit(): void {
    this.initializeCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availabilities'] && !changes['availabilities'].firstChange) {
      this.updateCalendarWithAvailabilities();
    }
  }

  initializeCalendar(): void {
    // Generar franjas horarias (de 6am a 10pm, con intervalos de 1 hora)
    this.timeSlots = this.generateTimeSlots(6, 22, 60);

    // Inicializar días de la semana
    this.daySlots = DAYS_OF_WEEK.map(day => {
      return {
        day: day.value,
        dayName: day.label,
        timeSlots: this.timeSlots.map(timeSlot => ({
          ...timeSlot,
          availabilities: [],
          hasAvailability: false
        }))
      };
    });

    // Actualizar con disponibilidades
    this.updateCalendarWithAvailabilities();
  }

  private generateTimeSlots(startHour: number, endHour: number, intervalMinutes: number): TimeSlot[] {
    const slots: TimeSlot[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          displayTime: formatTimeDisplay(time),
          hour
        });
      }
    }

    return slots;
  }


  updateCalendarWithAvailabilities(): void {
    // Limpiar disponibilidades existentes
    this.daySlots.forEach(daySlot => {
      daySlot.timeSlots.forEach(timeSlot => {
        timeSlot.availabilities = [];
        timeSlot.hasAvailability = false;
      });
    });

    // Agregar disponibilidades al calendario
    this.availabilities.forEach(availability => {
      const dayIndex = this.daySlots.findIndex(d => d.day === availability.dayOfWeek);
      if (dayIndex === -1) return;

      const day = this.daySlots[dayIndex];

      // Determinar qué slots de tiempo están cubiertos por esta disponibilidad
      day.timeSlots.forEach(timeSlot => {
        if (this.isTimeSlotCovered(timeSlot, availability)) {
          timeSlot.availabilities.push(availability);
          timeSlot.hasAvailability = true;
        }
      });
    });
  }

  private isTimeSlotCovered(timeSlot: TimeSlot, availability: TeacherAvailabilityResponse): boolean {
    const slotHour = timeSlot.hour;
    const slotMinute = parseInt(timeSlot.time.split(':')[1], 10);
    const slotTotalMinutes = slotHour * 60 + slotMinute;

    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    // El slot está cubierto si está dentro del rango de disponibilidad
    return slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes;
  }

  getSlotTooltip(calendarSlot: CalendarTimeSlot, day: DayOfWeek): string {
    if (!calendarSlot.hasAvailability) {
      return `No disponible el ${getDayName(day)} a las ${calendarSlot.displayTime}`;
    }

    const availabilityInfo = calendarSlot.availabilities.map(availability =>
      `${availability.startTime} - ${availability.endTime}`
    ).join(', ');

    return `Disponible el ${getDayName(day)}: ${availabilityInfo}`;
  }

  trackByDay(index: number, daySlot: DaySlot): DayOfWeek {
    return daySlot.day;
  }

  trackByTime(index: number, timeSlot: CalendarTimeSlot): string {
    return timeSlot.time;
  }
}
