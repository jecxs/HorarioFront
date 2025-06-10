// src/app/features/docentes/components/disponibilidad/disponibilidad-week-view.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

import { TeacherAvailabilityResponse, DayOfWeek } from '../../models/disponibilidad.model';

interface TimeSlot {
  hour: number;
  label: string;
  periods: {
    quarter: number;
    time: string;
  }[];
}

interface DaySchedule {
  day: DayOfWeek;
  displayName: string;
  shortName: string;
  availabilities: TeacherAvailabilityResponse[];
  timeBlocks: {
    startMinute: number;
    endMinute: number;
    availability: TeacherAvailabilityResponse;
    height: number;
    top: number;
  }[];
}

@Component({
  selector: 'app-disponibilidad-week-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    <div class="week-view-container">
      <mat-card class="schedule-card">
        <mat-card-header>
          <div class="schedule-header">
            <h4 class="schedule-title">
              <mat-icon>view_week</mat-icon>
              Vista Semanal
            </h4>
            <div class="view-legend">
              <div class="legend-item">
                <div class="legend-color available"></div>
                <span>Disponible</span>
              </div>
            </div>
          </div>
        </mat-card-header>

        <mat-card-content class="schedule-content">
          <div class="schedule-grid">
            <!-- Header con días de la semana -->
            <div class="time-header"></div>
            <div
              *ngFor="let daySchedule of weekSchedule"
              class="day-header"
              [class.has-availability]="daySchedule.availabilities.length > 0">

              <div class="day-info">
                <span class="day-name">{{ daySchedule.displayName }}</span>
                <span class="day-short">{{ daySchedule.shortName }}</span>
                <span class="availability-count" *ngIf="daySchedule.availabilities.length > 0">
                  {{ daySchedule.availabilities.length }} bloque{{ daySchedule.availabilities.length > 1 ? 's' : '' }}
                </span>
              </div>

              <button
                mat-icon-button
                class="add-day-button"
                matTooltip="Agregar disponibilidad para {{ daySchedule.displayName }}"
                (click)="onAddForDay(daySchedule.day)">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <!-- Grid de horas -->
            <ng-container *ngFor="let timeSlot of timeSlots; trackBy: trackByTimeSlot">
              <!-- Columna de tiempo -->
              <div class="time-slot" [class.major-hour]="timeSlot.hour % 2 === 0">
                <span class="time-label">{{ timeSlot.label }}</span>
              </div>

              <!-- Columnas de días -->
              <div
                *ngFor="let daySchedule of weekSchedule"
                class="day-slot"
                [class.has-blocks]="hasBlocksInThisSlot(daySchedule, timeSlot.hour)">

                <!-- Bloques de disponibilidad para esta hora específica -->
                <div
                  *ngFor="let block of getBlocksForTimeSlot(daySchedule, timeSlot.hour); trackBy: trackByBlock"
                  class="availability-block"
                  [style.top.px]="getBlockTopInSlot(block, timeSlot.hour)"
                  [style.height.px]="getBlockHeightInSlot(block, timeSlot.hour)"
                  [matTooltip]="getBlockTooltip(block.availability)"
                  [matMenuTriggerFor]="blockMenu"
                  [matMenuTriggerData]="{ availability: block.availability }"
                  (click)="selectBlock(block.availability)">

                  <div class="block-content">
                    <div class="block-time" *ngIf="isBlockStart(block, timeSlot.hour)">
                      {{ block.availability.startTime.slice(0,5) }}
                    </div>
                    <div class="block-duration" *ngIf="isBlockStart(block, timeSlot.hour)">
                      {{ calculateBlockDuration(block.availability) }}h
                    </div>
                    <div class="block-actions">
                      <mat-icon class="action-icon">more_vert</mat-icon>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Menú contextual para bloques -->
      <mat-menu #blockMenu="matMenu">
        <ng-template matMenuContent let-availability="availability">
          <button mat-menu-item (click)="onEditAvailability(availability)">
            <mat-icon>edit</mat-icon>
            <span>Editar</span>
          </button>
          <button mat-menu-item (click)="onDeleteAvailability(availability)" class="warn-menu-item">
            <mat-icon>delete</mat-icon>
            <span>Eliminar</span>
          </button>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styleUrls: ['./disponibilidad-week-view.component.scss']
})
export class DisponibilidadWeekViewComponent implements OnChanges {
  @Input() availabilities: TeacherAvailabilityResponse[] = [];
  @Output() editAvailability = new EventEmitter<TeacherAvailabilityResponse>();
  @Output() deleteAvailability = new EventEmitter<TeacherAvailabilityResponse>();
  @Output() addForDay = new EventEmitter<DayOfWeek>();

  weekSchedule: DaySchedule[] = [];
  timeSlots: TimeSlot[] = [];
  selectedBlock: TeacherAvailabilityResponse | null = null;

  // Configuración de la vista - REDUCIDO para ser más compacto
  readonly START_HOUR = 6;  // 6:00 AM
  readonly END_HOUR = 22;   // 10:00 PM
  readonly HOUR_HEIGHT = 40; // pixels por hora (reducido de 60 a 40)

  private readonly daysOfWeek: { day: DayOfWeek; displayName: string; shortName: string }[] = [
    { day: 'MONDAY', displayName: 'Lunes', shortName: 'LUN' },
    { day: 'TUESDAY', displayName: 'Martes', shortName: 'MAR' },
    { day: 'WEDNESDAY', displayName: 'Miércoles', shortName: 'MIE' },
    { day: 'THURSDAY', displayName: 'Jueves', shortName: 'JUE' },
    { day: 'FRIDAY', displayName: 'Viernes', shortName: 'VIE' },
    { day: 'SATURDAY', displayName: 'Sábado', shortName: 'SAB' },
    { day: 'SUNDAY', displayName: 'Domingo', shortName: 'DOM' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availabilities']) {
      this.initializeSchedule();
    }
  }

  private initializeSchedule(): void {
    // Generar slots de tiempo
    this.generateTimeSlots();

    // Procesar disponibilidades por día
    this.weekSchedule = this.daysOfWeek.map(({ day, displayName, shortName }) => {
      const dayAvailabilities = this.availabilities.filter(a => a.dayOfWeek === day);
      const timeBlocks = this.generateTimeBlocks(dayAvailabilities);

      return {
        day,
        displayName,
        shortName,
        availabilities: dayAvailabilities,
        timeBlocks
      };
    });
  }

  private generateTimeSlots(): void {
    this.timeSlots = [];

    for (let hour = this.START_HOUR; hour <= this.END_HOUR; hour++) {
      const periods = [];

      // Generar cuartos de hora para cada hora
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        periods.push({ quarter, time });
      }

      this.timeSlots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        periods
      });
    }
  }

  private generateTimeBlocks(availabilities: TeacherAvailabilityResponse[]) {
    return availabilities.map(availability => {
      const startMinutes = this.timeToMinutes(availability.startTime);
      const endMinutes = this.timeToMinutes(availability.endTime);

      return {
        startMinute: startMinutes,
        endMinute: endMinutes,
        availability,
        height: 0, // Se calculará dinámicamente
        top: 0     // Se calculará dinámicamente
      };
    }).filter(block =>
      // Filtrar bloques que están dentro del rango de visualización
      block.startMinute < (this.END_HOUR * 60) &&
      block.endMinute > (this.START_HOUR * 60)
    );
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  hasBlocksInThisSlot(daySchedule: DaySchedule, hour: number): boolean {
    const hourStartMinutes = hour * 60;
    const hourEndMinutes = (hour + 1) * 60;

    return daySchedule.timeBlocks.some(block =>
      block.startMinute < hourEndMinutes && block.endMinute > hourStartMinutes
    );
  }

  getBlocksForTimeSlot(daySchedule: DaySchedule, hour: number): any[] {
    const hourStartMinutes = hour * 60;
    const hourEndMinutes = (hour + 1) * 60;

    return daySchedule.timeBlocks.filter(block =>
      block.startMinute < hourEndMinutes && block.endMinute > hourStartMinutes
    );
  }

  getBlockTopInSlot(block: any, hour: number): number {
    const hourStartMinutes = hour * 60;
    const blockStartInThisHour = Math.max(block.startMinute, hourStartMinutes);
    const minutesFromHourStart = blockStartInThisHour - hourStartMinutes;

    // Convertir minutos a pixels (60 minutos = HOUR_HEIGHT pixels)
    return (minutesFromHourStart / 60) * this.HOUR_HEIGHT;
  }

  getBlockHeightInSlot(block: any, hour: number): number {
    const hourStartMinutes = hour * 60;
    const hourEndMinutes = (hour + 1) * 60;

    const blockStartInThisHour = Math.max(block.startMinute, hourStartMinutes);
    const blockEndInThisHour = Math.min(block.endMinute, hourEndMinutes);

    const durationInThisHour = blockEndInThisHour - blockStartInThisHour;

    // Convertir minutos a pixels
    return Math.max((durationInThisHour / 60) * this.HOUR_HEIGHT, 20); // Mínimo 20px
  }

  isBlockStart(block: any, hour: number): boolean {
    const hourStartMinutes = hour * 60;
    return block.startMinute >= hourStartMinutes && block.startMinute < hourStartMinutes + 60;
  }

  calculateBlockDuration(availability: TeacherAvailabilityResponse): number {
    const startMinutes = this.timeToMinutes(availability.startTime);
    const endMinutes = this.timeToMinutes(availability.endTime);
    return Math.round((endMinutes - startMinutes) / 60 * 10) / 10;
  }

  getBlockTooltip(availability: TeacherAvailabilityResponse): string {
    const duration = this.calculateBlockDuration(availability);
    const dayName = this.daysOfWeek.find(d => d.day === availability.dayOfWeek)?.displayName || '';

    return `${dayName}\n${availability.startTime.slice(0,5)} - ${availability.endTime.slice(0,5)}\nDuración: ${duration} horas\n\nClick para opciones`;
  }

  selectBlock(availability: TeacherAvailabilityResponse): void {
    this.selectedBlock = availability;
  }

  onEditAvailability(availability: TeacherAvailabilityResponse): void {
    this.editAvailability.emit(availability);
  }

  onDeleteAvailability(availability: TeacherAvailabilityResponse): void {
    this.deleteAvailability.emit(availability);
  }

  onAddForDay(day: DayOfWeek): void {
    this.addForDay.emit(day);
  }

  trackByTimeSlot(index: number, timeSlot: TimeSlot): number {
    return timeSlot.hour;
  }

  trackByBlock(index: number, block: any): string {
    return block.availability.uuid;
  }
}
