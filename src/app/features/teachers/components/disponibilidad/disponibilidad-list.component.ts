// src/app/features/docentes/components/disponibilidad/disponibilidad-list.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { finalize } from 'rxjs/operators';

import { TeacherWithAvailabilitiesResponse } from '../../models/docente.model';
import { TeacherAvailabilityResponse, DayOfWeek } from '../../models/disponibilidad.model';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { DisponibilidadFormComponent } from './disponibilidad-form.component';
import { DisponibilidadWeekViewComponent } from './disponibilidad-week-view.component';
import { DisponibilidadCopyDialogComponent } from './disponibilidad-copy-dialog.component';

interface DayAvailabilities {
  day: DayOfWeek;
  displayName: string;
  availabilities: TeacherAvailabilityResponse[];
  totalHours: number;
}

@Component({
  selector: 'app-disponibilidad-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    DisponibilidadWeekViewComponent
  ],
  template: `
    <div class="disponibilidad-container">
      <!-- Header con estadísticas -->
      <div class="disponibilidad-header">
        <div class="header-info">
          <h3 class="section-title">
            <mat-icon>schedule</mat-icon>
            Disponibilidad Semanal
          </h3>
          <div class="stats-summary" *ngIf="!loading && docente">
            <div class="stat-item">
              <span class="stat-number">{{ availabilityStats.totalHours }}</span>
              <span class="stat-label">Horas totales</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ availabilityStats.daysWithAvailability }}</span>
              <span class="stat-label">Días disponibles</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ availabilityStats.averageHoursPerDay }}</span>
              <span class="stat-label">Promedio/día</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button
            mat-raised-button
            color="primary"
            (click)="openCreateDialog()"
            [disabled]="loading">
            <mat-icon>add</mat-icon>
            Agregar Disponibilidad
          </button>

          <button
            mat-button
            [matMenuTriggerFor]="actionsMenu"
            [disabled]="loading || !hasAvailabilities">
            <mat-icon>more_vert</mat-icon>
          </button>

          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="openCopyDialog()">
              <mat-icon>content_copy</mat-icon>
              <span>Copiar disponibilidades</span>
            </button>
            <button mat-menu-item (click)="clearAllAvailabilities()" class="warn-menu-item">
              <mat-icon>delete_sweep</mat-icon>
              <span>Limpiar todas</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando disponibilidades...</p>
      </div>

      <!-- Content -->
      <div *ngIf="!loading" class="disponibilidad-content">
        <!-- Vista semanal -->
        <app-disponibilidad-week-view
          [availabilities]="docente?.availabilities || []"
          (editAvailability)="editAvailability($event)"
          (deleteAvailability)="deleteAvailability($event)"
          (addForDay)="openCreateDialog($event)">
        </app-disponibilidad-week-view>

        <!-- Vista detallada por días -->
        <div class="days-detail-section" *ngIf="hasAvailabilities">
          <h4 class="detail-title">
            <mat-icon>view_list</mat-icon>
            Detalle por días
          </h4>

          <div class="days-grid">
            <mat-card
              *ngFor="let dayData of groupedAvailabilities"
              class="day-card"
              [class.empty-day]="dayData.availabilities.length === 0">

              <mat-card-header>
                <div class="day-header">
                  <h5 class="day-name">{{ dayData.displayName }}</h5>
                  <div class="day-stats">
                    <span class="hours-count">{{ dayData.totalHours }}h</span>
                    <span class="blocks-count">{{ dayData.availabilities.length }} bloques</span>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div *ngIf="dayData.availabilities.length === 0" class="empty-day-content">
                  <mat-icon class="empty-icon">schedule_send</mat-icon>
                  <p>Sin disponibilidad</p>
                  <button
                    mat-button
                    color="primary"
                    size="small"
                    (click)="openCreateDialog(dayData.day)">
                    <mat-icon>add</mat-icon>
                    Agregar
                  </button>
                </div>

                <div *ngIf="dayData.availabilities.length > 0" class="availability-list">
                  <div
                    *ngFor="let availability of dayData.availabilities; trackBy: trackByAvailability"
                    class="availability-item">

                    <div class="time-info">
                      <mat-icon class="time-icon">access_time</mat-icon>
                      <span class="time-range">
                        {{ availability.startTime | slice:0:5 }} - {{ availability.endTime | slice:0:5 }}
                      </span>
                      <span class="duration">
                        ({{ calculateDuration(availability.startTime, availability.endTime) }}h)
                      </span>
                    </div>

                    <div class="item-actions">
                      <button
                        mat-icon-button
                        color="primary"
                        matTooltip="Editar horario"
                        (click)="editAvailability(availability)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button
                        mat-icon-button
                        color="warn"
                        matTooltip="Eliminar horario"
                        (click)="deleteAvailability(availability)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </mat-card-content>

              <mat-card-actions *ngIf="dayData.availabilities.length > 0" class="day-actions">
                <button
                  mat-button
                  color="primary"
                  (click)="openCreateDialog(dayData.day)">
                  <mat-icon>add</mat-icon>
                  Agregar más
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!hasAvailabilities" class="empty-state">
          <mat-icon class="empty-state-icon">schedule</mat-icon>
          <h4>Sin disponibilidades registradas</h4>
          <p>El docente aún no ha registrado sus horarios disponibles.</p>
          <button
            mat-raised-button
            color="primary"
            (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Registrar primera disponibilidad
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./disponibilidad-list.component.scss']
})
export class DisponibilidadListComponent implements OnInit, OnChanges {
  @Input() docente: TeacherWithAvailabilitiesResponse | null = null;
  @Output() availabilityChange = new EventEmitter<TeacherAvailabilityResponse[]>();

  loading = false;
  groupedAvailabilities: DayAvailabilities[] = [];
  availabilityStats = {
    totalHours: 0,
    daysWithAvailability: 0,
    averageHoursPerDay: 0,
    longestBlock: 0,
    shortestBlock: 0
  };

  private readonly daysOfWeek: { day: DayOfWeek; displayName: string }[] = [
    { day: 'MONDAY', displayName: 'Lunes' },
    { day: 'TUESDAY', displayName: 'Martes' },
    { day: 'WEDNESDAY', displayName: 'Miércoles' },
    { day: 'THURSDAY', displayName: 'Jueves' },
    { day: 'FRIDAY', displayName: 'Viernes' },
    { day: 'SATURDAY', displayName: 'Sábado' },
    { day: 'SUNDAY', displayName: 'Domingo' }
  ];

  constructor(
    private disponibilidadService: DisponibilidadService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.processAvailabilities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docente']) {
      this.processAvailabilities();
    }
  }

  get hasAvailabilities(): boolean {
    return this.docente?.availabilities?.length ? this.docente.availabilities.length > 0 : false;
  }

  processAvailabilities(): void {
    if (!this.docente?.availabilities) {
      this.resetData();
      return;
    }

    // Agrupar por días
    this.groupedAvailabilities = this.daysOfWeek.map(({ day, displayName }) => {
      const dayAvailabilities = this.docente!.availabilities.filter(a => a.dayOfWeek === day);
      const totalHours = this.calculateTotalHours(dayAvailabilities);

      return {
        day,
        displayName,
        availabilities: dayAvailabilities.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        totalHours
      };
    });

    // Calcular estadísticas
    this.availabilityStats = this.disponibilidadService.getAvailabilityStats(this.docente.availabilities);
  }

  private resetData(): void {
    this.groupedAvailabilities = this.daysOfWeek.map(({ day, displayName }) => ({
      day,
      displayName,
      availabilities: [],
      totalHours: 0
    }));

    this.availabilityStats = {
      totalHours: 0,
      daysWithAvailability: 0,
      averageHoursPerDay: 0,
      longestBlock: 0,
      shortestBlock: 0
    };
  }

  private calculateTotalHours(availabilities: TeacherAvailabilityResponse[]): number {
    return availabilities.reduce((total, availability) => {
      return total + this.calculateDuration(availability.startTime, availability.endTime);
    }, 0);
  }

  calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return Math.round((endMinutes - startMinutes) / 60 * 10) / 10;
  }

  trackByAvailability(index: number, availability: TeacherAvailabilityResponse): string {
    return availability.uuid;
  }

  openCreateDialog(preselectedDay?: DayOfWeek): void {
    if (!this.docente) return;

    const dialogRef = this.dialog.open(DisponibilidadFormComponent, {
      width: '500px',
      data: {
        teacherUuid: this.docente.uuid,
        teacherName: this.docente.fullName,
        preselectedDay,
        existingAvailabilities: this.docente.availabilities
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshAvailabilities();
      }
    });
  }

  editAvailability(availability: TeacherAvailabilityResponse): void {
    if (!this.docente) return;

    const dialogRef = this.dialog.open(DisponibilidadFormComponent, {
      width: '500px',
      data: {
        teacherUuid: this.docente.uuid,
        teacherName: this.docente.fullName,
        editingAvailability: availability,
        existingAvailabilities: this.docente.availabilities.filter(a => a.uuid !== availability.uuid)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshAvailabilities();
      }
    });
  }

  deleteAvailability(availability: TeacherAvailabilityResponse): void {
    if (!confirm(`¿Está seguro de eliminar la disponibilidad del ${this.getDayDisplayName(availability.dayOfWeek)} de ${availability.startTime.slice(0,5)} a ${availability.endTime.slice(0,5)}?`)) {
      return;
    }

    this.loading = true;
    this.disponibilidadService.deleteAvailability(availability.uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.showMessage('Disponibilidad eliminada correctamente', 'success');
          this.refreshAvailabilities();
        },
        error: (error) => {
          console.error('Error al eliminar disponibilidad:', error);
          this.showMessage('Error al eliminar la disponibilidad', 'error');
        }
      });
  }

  openCopyDialog(): void {
    if (!this.docente || !this.hasAvailabilities) return;

    const dialogRef = this.dialog.open(DisponibilidadCopyDialogComponent, {
      width: '600px',
      data: {
        teacherUuid: this.docente.uuid,
        teacherName: this.docente.fullName,
        availabilities: this.docente.availabilities
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshAvailabilities();
      }
    });
  }

  clearAllAvailabilities(): void {
    if (!this.docente || !this.hasAvailabilities) return;

    if (!confirm('¿Está seguro de eliminar TODAS las disponibilidades del docente? Esta acción no se puede deshacer.')) {
      return;
    }

    this.loading = true;
    this.disponibilidadService.deleteAllTeacherAvailabilities(this.docente.uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.showMessage('Todas las disponibilidades han sido eliminadas', 'success');
          this.refreshAvailabilities();
        },
        error: (error) => {
          console.error('Error al eliminar disponibilidades:', error);
          this.showMessage('Error al eliminar las disponibilidades', 'error');
        }
      });
  }

  private refreshAvailabilities(): void {
    if (!this.docente) return;

    this.loading = true;
    this.disponibilidadService.getTeacherAvailabilities(this.docente.uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          if (this.docente) {
            this.docente.availabilities = response.data;
            this.processAvailabilities();
            this.availabilityChange.emit(response.data);
          }
        },
        error: (error) => {
          console.error('Error al actualizar disponibilidades:', error);
          this.showMessage('Error al actualizar las disponibilidades', 'error');
        }
      });
  }

  private getDayDisplayName(day: DayOfWeek): string {
    const dayInfo = this.daysOfWeek.find(d => d.day === day);
    return dayInfo?.displayName || day;
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: `${type}-snackbar`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
