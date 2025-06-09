// src/app/features/docentes/components/disponibilidad/disponibilidad-list.component.ts
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';

import { TeacherResponse, TeacherWithAvailabilitiesResponse } from '../../models/docente.model';
import {
  TeacherAvailabilityResponse,
  TeacherAvailabilityRequest,
  DayOfWeek,
  DAYS_OF_WEEK,
  getDayName
} from '../../models/disponibilidad.model';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { DisponibilidadCalendarComponent } from './disponibilidad-calendar.component';
import { DisponibilidadFormComponent } from './disponibilidad-form.component';

@Component({
  selector: 'app-disponibilidad-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDialogModule,
    DisponibilidadFormComponent,
    DisponibilidadCalendarComponent,
  ],
  templateUrl: './disponibilidad-list.component.html',
  styleUrls: ['./disponibilidad-list.component.scss']
})
export class DisponibilidadListComponent implements OnInit, OnChanges {
  @Input() docente!: TeacherResponse | TeacherWithAvailabilitiesResponse;
  @Input() readOnly: boolean = false;
  @Output() availabilityChange = new EventEmitter<TeacherAvailabilityResponse[]>();

  availabilities: TeacherAvailabilityResponse[] = [];
  groupedAvailabilities: Map<DayOfWeek, TeacherAvailabilityResponse[]> = new Map();
  daysOfWeek = DAYS_OF_WEEK;

  loading = false;
  saving = false;
  showForm = false;
  selectedDay: DayOfWeek | null = null;
  editingAvailability: TeacherAvailabilityResponse | null = null;

  displayedColumns = ['day', 'startTime', 'endTime', 'duration', 'actions'];

  // Estadísticas
  availabilityStats = {
    totalHours: 0,
    daysWithAvailability: 0,
    averageHoursPerDay: 0,
    longestBlock: 0,
    shortestBlock: 0
  };

  constructor(
    private disponibilidadService: DisponibilidadService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if ('availabilities' in this.docente) {
      this.availabilities = this.docente.availabilities;
      this.groupAvailabilities();
      this.updateStats();
    } else {
      this.loadAvailabilities();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docente'] && !changes['docente'].firstChange) {
      this.loadAvailabilities();
    }
  }

  loadAvailabilities(): void {
    this.loading = true;
    this.disponibilidadService.getTeacherAvailabilities(this.docente.uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.availabilities = response.data;
          this.groupAvailabilities();
          this.updateStats();
          this.availabilityChange.emit(this.availabilities);
        },
        error: (error) => {
          console.error('Error al cargar disponibilidades:', error);
          this.showMessage('Error al cargar las disponibilidades', 'error');
        }
      });
  }

  groupAvailabilities(): void {
    this.groupedAvailabilities.clear();

    // Inicializar el mapa con todos los días
    this.daysOfWeek.forEach(day => {
      this.groupedAvailabilities.set(day.value, []);
    });

    // Agrupar disponibilidades por día
    this.availabilities.forEach(availability => {
      const day = availability.dayOfWeek;
      const availabilitiesForDay = this.groupedAvailabilities.get(day) || [];
      availabilitiesForDay.push(availability);
      this.groupedAvailabilities.set(day, availabilitiesForDay);
    });

    // Ordenar cada grupo por hora de inicio
    this.groupedAvailabilities.forEach((availabilities, day) => {
      this.groupedAvailabilities.set(
        day,
        availabilities.sort((a, b) => a.startTime.localeCompare(b.startTime))
      );
    });
  }

  updateStats(): void {
    this.availabilityStats = this.disponibilidadService.getAvailabilityStats(this.availabilities);
  }

  getDayName(day: DayOfWeek): string {
    return getDayName(day);
  }

  formatTime(time: string): string {
    return this.formatTimeDisplay(time);
  }

  private formatTimeDisplay(time: string): string {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

    return `${displayHour}:${minuteStr} ${period}`;
  }

  calculateDuration(startTime: string, endTime: string): string {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`;
    }
    return `${minutes}min`;
  }

  hasAvailabilities(): boolean {
    return this.availabilities.length > 0;
  }

  hasAvailabilitiesForDay(day: DayOfWeek): boolean {
    return (this.groupedAvailabilities.get(day)?.length || 0) > 0;
  }

  getTotalDaysWithAvailability(): number {
    return this.availabilityStats.daysWithAvailability;
  }

  getTotalHours(): number {
    return this.availabilityStats.totalHours;
  }

  // ===== ACCIONES DE DISPONIBILIDAD =====

  addAvailability(day: DayOfWeek): void {
    this.selectedDay = day;
    this.editingAvailability = null;
    this.showForm = true;
  }

  editAvailability(availability: TeacherAvailabilityResponse): void {
    this.editingAvailability = availability;
    this.selectedDay = availability.dayOfWeek;
    this.showForm = true;
  }

  confirmDeleteAvailability(availability: TeacherAvailabilityResponse): void {
    const confirmed = confirm(
      `¿Estás seguro de eliminar esta disponibilidad para el ${getDayName(availability.dayOfWeek)} de ${this.formatTime(availability.startTime)} a ${this.formatTime(availability.endTime)}?`
    );

    if (confirmed) {
      this.deleteAvailability(availability);
    }
  }

  deleteAvailability(availability: TeacherAvailabilityResponse): void {
    this.disponibilidadService.deleteAvailability(availability.uuid)
      .subscribe({
        next: () => {
          this.showMessage('Disponibilidad eliminada correctamente', 'success');
          this.removeAvailabilityFromList(availability.uuid);
        },
        error: (error) => {
          console.error('Error al eliminar disponibilidad:', error);
          this.showMessage('Error al eliminar la disponibilidad', 'error');
        }
      });
  }

  confirmDeleteAllAvailabilities(): void {
    if (!this.hasAvailabilities()) {
      this.showMessage('No hay disponibilidades para eliminar', 'info');
      return;
    }

    const confirmed = confirm(
      `¿Estás seguro de eliminar todas las disponibilidades del docente ${this.docente.fullName}?`
    );

    if (confirmed) {
      this.deleteAllAvailabilities();
    }
  }

  deleteAllAvailabilities(): void {
    this.saving = true;
    this.disponibilidadService.deleteAllTeacherAvailabilities(this.docente.uuid)
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.showMessage('Todas las disponibilidades han sido eliminadas', 'success');
          this.availabilities = [];
          this.groupAvailabilities();
          this.updateStats();
          this.availabilityChange.emit(this.availabilities);
        },
        error: (error) => {
          console.error('Error al eliminar todas las disponibilidades:', error);
          this.showMessage('Error al eliminar las disponibilidades', 'error');
        }
      });
  }

  // ===== MANEJO DE FORMULARIOS =====

  onAvailabilityCreated(availability: TeacherAvailabilityRequest): void {
    this.saving = true;
    this.disponibilidadService.createAvailability(this.docente.uuid, availability)
      .pipe(finalize(() => {
        this.saving = false;
        this.showForm = false;
        this.selectedDay = null;
        this.editingAvailability = null;
      }))
      .subscribe({
        next: (response) => {
          this.showMessage('Disponibilidad agregada correctamente', 'success');
          this.addAvailabilityToList(response.data);
        },
        error: (error) => {
          console.error('Error al agregar disponibilidad:', error);
          this.showMessage('Error al agregar la disponibilidad', 'error');
        }
      });
  }

  onAvailabilityUpdated(updateData: {uuid: string, data: TeacherAvailabilityRequest}): void {
    this.saving = true;
    this.disponibilidadService.updateAvailability(updateData.uuid, updateData.data)
      .pipe(finalize(() => {
        this.saving = false;
        this.showForm = false;
        this.selectedDay = null;
        this.editingAvailability = null;
      }))
      .subscribe({
        next: (response) => {
          this.showMessage('Disponibilidad actualizada correctamente', 'success');
          this.updateAvailabilityInList(response.data);
        },
        error: (error) => {
          console.error('Error al actualizar disponibilidad:', error);
          this.showMessage('Error al actualizar la disponibilidad', 'error');
        }
      });
  }

  onCancelForm(): void {
    this.showForm = false;
    this.selectedDay = null;
    this.editingAvailability = null;
  }

  // ===== FUNCIONES DE COPIA =====

  copyFromDay(fromDay: DayOfWeek, toDay: DayOfWeek): void {
    const confirmed = confirm(
      `¿Copiar todas las disponibilidades de ${getDayName(fromDay)} a ${getDayName(toDay)}? Esto reemplazará las disponibilidades existentes en ${getDayName(toDay)}.`
    );

    if (confirmed) {
      this.saving = true;
      this.disponibilidadService.copyAvailabilitiesFromDay(
        this.docente.uuid,
        fromDay,
        toDay,
        true // reemplazar existentes
      )
        .pipe(finalize(() => this.saving = false))
        .subscribe({
          next: (response) => {
            this.showMessage(`Disponibilidades copiadas de ${getDayName(fromDay)} a ${getDayName(toDay)}`, 'success');
            this.loadAvailabilities(); // Recargar para mostrar los cambios
          },
          error: (error) => {
            console.error('Error al copiar disponibilidades:', error);
            this.showMessage('Error al copiar las disponibilidades', 'error');
          }
        });
    }
  }

  // ===== UTILIDADES PRIVADAS =====

  private addAvailabilityToList(availability: TeacherAvailabilityResponse): void {
    this.availabilities.push(availability);
    this.groupAvailabilities();
    this.updateStats();
    this.availabilityChange.emit(this.availabilities);
  }

  private updateAvailabilityInList(availability: TeacherAvailabilityResponse): void {
    const index = this.availabilities.findIndex(a => a.uuid === availability.uuid);
    if (index !== -1) {
      this.availabilities[index] = availability;
      this.groupAvailabilities();
      this.updateStats();
      this.availabilityChange.emit(this.availabilities);
    }
  }

  private removeAvailabilityFromList(uuid: string): void {
    this.availabilities = this.availabilities.filter(a => a.uuid !== uuid);
    this.groupAvailabilities();
    this.updateStats();
    this.availabilityChange.emit(this.availabilities);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: `${type}-snackbar`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
  trackByUuid(index: number, item: TeacherAvailabilityResponse): string {
    return item.uuid;
  }
}
