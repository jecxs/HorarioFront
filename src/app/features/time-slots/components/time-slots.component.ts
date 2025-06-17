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
  template: `
    <div class="time-slots-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1>
              <mat-icon>schedule</mat-icon>
              Gestión de Turnos y Horas Pedagógicas
            </h1>
            <p class="subtitle">
              Configure los turnos de clases y sus horas pedagógicas correspondientes
            </p>
          </div>

          <div class="header-actions">
            <button
              mat-raised-button
              color="primary"
              (click)="openCreateDialog()">
              <mat-icon>add_alarm</mat-icon>
              <span *ngIf="!(isHandset$ | async)">Crear Turno</span>
            </button>
          </div>
        </div>

        <!-- Información explicativa -->
        <div class="info-banner">
          <mat-icon>lightbulb</mat-icon>
          <div class="info-content">
            <strong>¿Qué son los turnos y horas pedagógicas?</strong>
            <p>Los turnos definen los períodos de clase en el día (ej: Mañana, Tarde).
               Las horas pedagógicas son los bloques mínimos de tiempo que encajan exactamente dentro de cada turno.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner></mat-spinner>
        <p>Cargando turnos...</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-section" *ngIf="!loading && timeSlots.length > 0">
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalSlots }}</div>
                <div class="stat-label">Turnos Creados</div>
                <mat-icon class="stat-icon">schedule</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalTeachingHours }}</div>
                <div class="stat-label">Horas Pedagógicas</div>
                <mat-icon class="stat-icon">view_module</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-value">{{ formatMinutes(stats.totalDailyMinutes) }}</div>
                <div class="stat-label">Tiempo Total Diario</div>
                <mat-icon class="stat-icon">timelapse</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-value">{{ stats.averageHoursPerSlot }}</div>
                <div class="stat-label">Promedio Horas/Turno</div>
                <mat-icon class="stat-icon">trending_up</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Time Slots Grid -->
      <div class="content-section" *ngIf="!loading">

        <!-- Empty State -->
        <div class="empty-state" *ngIf="timeSlots.length === 0">
          <mat-icon>schedule</mat-icon>
          <h2>No hay turnos configurados</h2>
          <p>Cree el primer turno para comenzar a organizar los horarios de clases</p>
          <button
            mat-raised-button
            color="primary"
            (click)="openCreateDialog()">
            <mat-icon>add_alarm</mat-icon>
            Crear Primer Turno
          </button>
        </div>

        <!-- Time Slots List -->
        <div class="time-slots-grid" *ngIf="timeSlots.length > 0">
          <mat-card
            class="time-slot-card"
            *ngFor="let slot of sortedTimeSlots; trackBy: trackBySlot"
            [class.highlight]="slot.teachingHours.length === 0">

            <!-- Card Header -->
            <mat-card-header>
              <div mat-card-avatar class="slot-avatar">
                <mat-icon>schedule</mat-icon>
              </div>
              <mat-card-title>{{ slot.name }}</mat-card-title>
              <mat-card-subtitle>
                {{ slot.startTime }} - {{ slot.endTime }}
                <mat-chip
                  [color]="getSlotChipColor(slot)"
                  class="duration-chip">
                  {{ formatSlotDuration(slot) }}
                </mat-chip>
              </mat-card-subtitle>
            </mat-card-header>

            <!-- Teaching Hours Info -->
            <mat-card-content>
              <div class="teaching-hours-section">
                <div class="hours-header">
                  <h4>
                    <mat-icon>view_module</mat-icon>
                    Horas Pedagógicas
                    <mat-badge [matBadge]="slot.teachingHours.length" matBadgeColor="primary">
                    </mat-badge>
                  </h4>
                </div>

                <!-- Teaching Hours List -->
                <div class="hours-list" *ngIf="slot.teachingHours.length > 0">
                  <div
                    class="hour-item"
                    *ngFor="let hour of slot.teachingHours; let i = index"
                    [style.border-left-color]="getHourColor(i)">
                    <div class="hour-number">{{ hour.orderInTimeSlot }}</div>
                    <div class="hour-time">
                      <span class="time">{{ hour.startTime }} - {{ hour.endTime }}</span>
                      <span class="duration">{{ hour.durationMinutes }} min</span>
                    </div>
                  </div>
                </div>

                <!-- No Teaching Hours -->
                <div class="no-hours" *ngIf="slot.teachingHours.length === 0">
                  <mat-icon>warning</mat-icon>
                  <span>Sin horas pedagógicas configuradas</span>
                </div>

                <!-- Visual Timeline -->
                <div class="visual-timeline" *ngIf="slot.teachingHours.length > 0">
                  <div class="timeline-bar">
                    <div
                      class="time-segment"
                      *ngFor="let hour of slot.teachingHours; let i = index"
                      [style.background-color]="getHourColor(i)"
                      [style.flex]="1"
                      [matTooltip]="getHourTooltip(hour)">
                    </div>
                  </div>
                  <div class="timeline-labels">
                    <span>{{ slot.startTime }}</span>
                    <span>{{ slot.endTime }}</span>
                  </div>
                </div>
              </div>
            </mat-card-content>

            <!-- Card Actions -->
            <mat-card-actions align="end">
              <button
                mat-button
                color="primary"
                (click)="openEditDialog(slot)"
                matTooltip="Editar turno">
                <mat-icon>edit</mat-icon>
                <span *ngIf="!(isHandset$ | async)">Editar</span>
              </button>

              <button
                mat-button
                color="warn"
                (click)="confirmDelete(slot)"
                matTooltip="Eliminar turno">
                <mat-icon>delete</mat-icon>
                <span *ngIf="!(isHandset$ | async)">Eliminar</span>
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>

      <!-- Help Section -->
      <div class="help-section" *ngIf="!loading">
        <mat-card class="help-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>help_outline</mat-icon>
              Guía de Uso
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="help-content">
              <div class="help-item">
                <mat-icon>fiber_manual_record</mat-icon>
                <span><strong>Turnos:</strong> Definen períodos de clase en el día (ej: M1: 6:45-9:45, T1: 14:00-17:00)</span>
              </div>
              <div class="help-item">
                <mat-icon>fiber_manual_record</mat-icon>
                <span><strong>Horas Pedagógicas:</strong> Bloques mínimos de 30-60 min que encajan exactamente en cada turno</span>
              </div>
              <div class="help-item">
                <mat-icon>fiber_manual_record</mat-icon>
                <span><strong>Sin tiempo perdido:</strong> Las horas deben llenar completamente el turno sin dejar minutos libres</span>
              </div>
              <div class="help-item">
                <mat-icon>fiber_manual_record</mat-icon>
                <span><strong>Ejemplo:</strong> Turno de 3h = 4 bloques de 45min o 6 bloques de 30min</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .time-slots-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;

        .title-section {
          h1 {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 8px 0;
            font-size: 1.8rem;
            color: #333;

            mat-icon {
              color: #1976d2;
              font-size: 2rem;
              width: 2rem;
              height: 2rem;
            }
          }

          .subtitle {
            margin: 0;
            color: #666;
            font-size: 1rem;
          }
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }
      }

      .info-banner {
        display: flex;
        gap: 12px;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border-radius: 12px;
        padding: 16px;
        border-left: 4px solid #1976d2;

        mat-icon {
          color: #1976d2;
          margin-top: 2px;
        }

        .info-content {
          color: #0d47a1;

          strong {
            display: block;
            margin-bottom: 4px;
          }

          p {
            margin: 0;
            font-size: 0.9rem;
            line-height: 1.4;
          }
        }
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;

      p {
        color: #666;
        margin: 0;
      }
    }

    .stats-section {
      margin-bottom: 32px;

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;

        .stat-card {
          .stat-content {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .stat-value {
              font-size: 2rem;
              font-weight: 600;
              color: #1976d2;
            }

            .stat-label {
              font-size: 0.9rem;
              color: #666;
              margin-top: 4px;
            }

            .stat-icon {
              font-size: 2.5rem;
              width: 2.5rem;
              height: 2.5rem;
              color: #e3f2fd;
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #ccc;
        margin-bottom: 16px;
      }

      h2 {
        margin: 0 0 8px 0;
        color: #666;
      }

      p {
        margin: 0 0 24px 0;
        color: #999;
        max-width: 400px;
      }
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;

      .time-slot-card {
        transition: transform 0.2s, box-shadow 0.2s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        &.highlight {
          border: 2px solid #ff9800;
          background: #fff8e1;
        }

        .slot-avatar {
          background: #1976d2;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 1.5rem;
            width: 1.5rem;
            height: 1.5rem;
          }
        }

        mat-card-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .duration-chip {
            font-size: 0.7rem;
            height: 20px;
            line-height: 20px;
          }
        }

        .teaching-hours-section {
          .hours-header {
            h4 {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 0 16px 0;
              color: #333;
              font-size: 1rem;

              mat-icon {
                color: #1976d2;
                font-size: 1.2rem;
                width: 1.2rem;
                height: 1.2rem;
              }
            }
          }

          .hours-list {
            margin-bottom: 16px;

            .hour-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 0;
              border-left: 3px solid;
              padding-left: 12px;
              margin-bottom: 8px;
              background: #f9f9f9;
              border-radius: 0 4px 4px 0;

              .hour-number {
                background: #1976d2;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: 600;
                flex-shrink: 0;
              }

              .hour-time {
                display: flex;
                flex-direction: column;
                gap: 2px;

                .time {
                  font-weight: 500;
                  color: #333;
                }

                .duration {
                  font-size: 0.8rem;
                  color: #666;
                }
              }
            }
          }

          .no-hours {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ff9800;
            background: #fff3e0;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;

            mat-icon {
              font-size: 1.2rem;
              width: 1.2rem;
              height: 1.2rem;
            }
          }

          .visual-timeline {
            .timeline-bar {
              display: flex;
              height: 8px;
              border-radius: 4px;
              overflow: hidden;
              background: #f0f0f0;
              margin-bottom: 4px;

              .time-segment {
                cursor: pointer;
                transition: opacity 0.2s;

                &:hover {
                  opacity: 0.8;
                }
              }
            }

            .timeline-labels {
              display: flex;
              justify-content: space-between;
              font-size: 0.7rem;
              color: #666;
            }
          }
        }
      }
    }

    .help-section {
      margin-top: 48px;

      .help-card {
        .help-content {
          .help-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 12px;

            &:last-child {
              margin-bottom: 0;
            }

            mat-icon {
              color: #1976d2;
              font-size: 0.8rem;
              width: 0.8rem;
              height: 0.8rem;
              margin-top: 4px;
            }

            span {
              font-size: 0.9rem;
              line-height: 1.4;
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .time-slots-container {
        padding: 16px;
      }

      .page-header {
        .header-content {
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
        }
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .time-slots-grid {
        grid-template-columns: 1fr;
      }

      .help-section {
        margin-top: 32px;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
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
