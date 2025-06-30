// src/app/features/time-slots/components/time-slots.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services and Components
import { TimeSlotService, TimeSlot } from '../services/time-slot.service';
import { TimeSlotDialogComponent } from './time-slot-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-time-slots',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: `./time-slots.component.html`,
  styleUrls: ['./time-slots.component.scss']
})


export class TimeSlotsComponent implements OnInit {
  private timeSlotService = inject(TimeSlotService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  // Observables
  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(map(result => result.matches), shareReplay());

  // Data
  timeSlots: TimeSlot[] = [];
  loading = false;
  stats = {
    totalSlots: 0,
    totalTeachingHours: 0,
    averageHoursPerSlot: 0,
    totalDailyMinutes: 0,
    commonDurations: [] as { duration: number; count: number }[]
  };


  ngOnInit(): void {
    this.loadTimeSlots();
  }

  loadTimeSlots(): void {
    this.loading = true;
    this.timeSlotService.getAllTimeSlots().subscribe({
      next: (response) => {
        this.timeSlots = Array.isArray(response.data) ? response.data : [response.data];
        this.updateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
        this.snackBar.open('Error al cargar los turnos', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateStats(): void {
    this.stats = this.timeSlotService.getTimeSlotStats(this.timeSlots);
  }

  get sortedTimeSlots(): TimeSlot[] {
    return [...this.timeSlots].sort((a, b) => {
      // Ordenar por hora de inicio
      return a.startTime.localeCompare(b.startTime);
    });
  }

  trackBySlot(index: number, slot: TimeSlot): string {
    return slot.uuid;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TimeSlotDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isNew: true,
        existingTimeSlots: this.timeSlots
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createTimeSlot(result);
      }
    });
  }

  openEditDialog(timeSlot: TimeSlot): void {
    const dialogRef = this.dialog.open(TimeSlotDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isNew: false,
        timeSlot,
        existingTimeSlots: this.timeSlots
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTimeSlot(timeSlot.uuid, result);
      }
    });
  }

  createTimeSlot(timeSlotData: any): void {
    this.timeSlotService.createTimeSlot(timeSlotData).subscribe({
      next: (response) => {
        this.snackBar.open('Turno creado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadTimeSlots();
      },
      error: (error) => {
        console.error('Error al crear turno:', error);
        this.snackBar.open(
          error.error?.error || 'Error al crear el turno',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  updateTimeSlot(uuid: string, timeSlotData: any): void {
    this.timeSlotService.updateTimeSlot(uuid, timeSlotData).subscribe({
      next: (response) => {
        this.snackBar.open('Turno actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadTimeSlots();
      },
      error: (error) => {
        console.error('Error al actualizar turno:', error);
        this.snackBar.open(
          error.error?.error || 'Error al actualizar el turno',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  confirmDelete(timeSlot: TimeSlot): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar el turno "${timeSlot.name}"?`,
        details: [
          `Horario: ${timeSlot.startTime} - ${timeSlot.endTime}`,
          `Horas pedagógicas: ${timeSlot.teachingHours.length}`,
          'Esta acción no se puede deshacer.'
        ],
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteTimeSlot(timeSlot);
      }
    });
  }

  deleteTimeSlot(timeSlot: TimeSlot): void {
    this.timeSlotService.deleteTimeSlot(timeSlot.uuid).subscribe({
      next: () => {
        this.snackBar.open('Turno eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadTimeSlots();
      },
      error: (error) => {
        console.error('Error al eliminar turno:', error);
        this.snackBar.open(
          error.error?.error || 'Error al eliminar el turno',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  formatSlotDuration(slot: TimeSlot): string {
    const duration = this.timeSlotService.calculateDurationInMinutes(slot.startTime, slot.endTime);
    return this.formatMinutes(duration);
  }

  formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  getSlotChipColor(slot: TimeSlot): 'primary' | 'accent' | 'warn' {
    if (slot.teachingHours.length === 0) return 'warn';

    const duration = this.timeSlotService.calculateDurationInMinutes(slot.startTime, slot.endTime);
    if (duration <= 120) return 'accent'; // 2 horas o menos
    if (duration <= 240) return 'primary'; // 4 horas o menos
    return 'warn'; // Más de 4 horas
  }

  getHourColor(index: number): string {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
      '#c62828', '#00796b', '#5d4037', '#455a64'
    ];
    return colors[index % colors.length];
  }

  getHourTooltip(hour: any): string {
    return `Hora ${hour.orderInTimeSlot}: ${hour.startTime} - ${hour.endTime} (${hour.durationMinutes} min)`;
  }
}
