// src/app/features/schedule-assignment/components/schedule-by-group/schedule-by-group.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';

// Services
import { ClassSessionService } from '../../services/class-session.service';
import { StudentGroupService, StudentGroup } from '../../../student-groups/services/student-group.service';
import { TimeSlotService, TimeSlot } from '../../../time-slots/services/time-slot.service';
import { PeriodService } from '../../../periods/services/period.service';

// Models
import {
  ClassSessionResponse,
  DayOfWeek,
  WORKING_DAYS,
  DAY_NAMES,
  ScheduleRow,
  ScheduleCell,
  TeachingHourResponse
} from '../../models/class-session.model';

// Components
import { AssignmentDialogComponent, AssignmentDialogData } from '../assignment-dialog/assignment-dialog.component';

@Component({
  selector: 'app-schedule-by-group',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatBadgeModule,
    MatMenuModule
  ],
  template: `
    <div class="schedule-container">
      <!-- Header con selector de grupo -->
      <div class="schedule-header">
        <button mat-icon-button (click)="goBack()" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>

        <h1>Horario por Grupo</h1>

        <div class="header-controls">
          <mat-form-field appearance="outline">
            <mat-label>Seleccionar Grupo</mat-label>
            <mat-select [formControl]="groupControl">
              <mat-option *ngFor="let group of studentGroups" [value]="group.uuid">
                {{ group.name }} - Ciclo {{ group.cycleNumber }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-raised-button color="primary"
                  [disabled]="!selectedGroup"
                  (click)="openAssignmentDialog()">
            <mat-icon>add</mat-icon>
            Nueva Asignación
          </button>
        </div>
      </div>

      <!-- Información del grupo seleccionado -->
      <mat-card *ngIf="selectedGroup" class="group-info-card">
        <mat-card-content>
          <div class="group-info">
            <div class="info-item">
              <mat-icon>groups</mat-icon>
              <span><strong>Grupo:</strong> {{ selectedGroup.name }}</span>
            </div>
            <div class="info-item">
              <mat-icon>school</mat-icon>
              <span><strong>Ciclo:</strong> {{ selectedGroup.cycleNumber }}</span>
            </div>
            <div class="info-item">
              <mat-icon>date_range</mat-icon>
              <span><strong>Periodo:</strong> {{ selectedGroup.periodName }}</span>
            </div>
            <div class="info-item">
              <mat-icon>schedule</mat-icon>
              <span><strong>Total Horas:</strong> {{ getTotalHours() }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tablero de horario -->
      <div class="schedule-board" *ngIf="selectedGroup && !loading">
        <div class="board-wrapper">
          <table class="schedule-table">
            <thead>
              <tr>
                <th class="time-header">Hora</th>
                <th *ngFor="let day of workingDays" class="day-header">
                  {{ getDayName(day) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of scheduleRows">
                <td class="time-cell">
                  <div class="time-slot-info">
                    <strong>{{ row.timeSlot.name }}</strong>
                    <div class="time-range" *ngFor="let hour of row.timeSlot.teachingHours">
                      {{ formatTime(hour.startTime) }} - {{ formatTime(hour.endTime) }}
                    </div>
                  </div>
                </td>
                <td *ngFor="let day of workingDays"
                    class="schedule-cell"
                    [class.has-session]="hasSessionInCell(row, day)">
                  <div class="cell-content">
                    <div *ngFor="let cell of getCellsForDay(row, day)"
                         class="hour-block"
                         [class.occupied]="cell.session"
                         [class.available]="!cell.session && cell.isAvailable"
                         [class.selected]="cell.isSelected"
                         (click)="onCellClick(row, day, cell)"
                         [matTooltip]="getCellTooltip(cell)">

                      <div *ngIf="cell.session" class="session-info">
                        <div class="course-name">{{ cell.session.course.name }}</div>
                        <div class="teacher-name">{{ cell.session.teacher.fullName }}</div>
                        <div class="room-name">{{ cell.session.learningSpace.name }}</div>
                        <mat-icon class="session-type-icon"
                                  [matTooltip]="cell.session.sessionType.name">
                          {{ getSessionTypeIcon(cell.session.sessionType.name) }}
                        </mat-icon>
                        <button mat-icon-button
                                class="edit-button"
                                (click)="editSession(cell.session)">
                          <mat-icon>edit</mat-icon>
                        </button>
                      </div>

                      <div *ngIf="!cell.session && cell.isAvailable" class="empty-cell">
                        <mat-icon class="add-icon">add_circle_outline</mat-icon>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Estado de carga -->
      <div *ngIf="loading" class="loading-state">
        <mat-spinner></mat-spinner>
        <p>Cargando horario...</p>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="!selectedGroup && !loading" class="empty-state">
        <mat-icon>event_busy</mat-icon>
        <h3>Seleccione un grupo</h3>
        <p>Elija un grupo de estudiantes para ver y gestionar su horario</p>
      </div>

      <!-- Leyenda -->
      <mat-card class="legend-card" *ngIf="selectedGroup">
        <mat-card-content>
          <h4>Leyenda</h4>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color theory"></div>
              <span>Clase Teórica</span>
            </div>
            <div class="legend-item">
              <div class="legend-color practice"></div>
              <span>Clase Práctica</span>
            </div>
            <div class="legend-item">
              <div class="legend-color available"></div>
              <span>Disponible</span>
            </div>
            <div class="legend-item">
              <div class="legend-color occupied"></div>
              <span>Ocupado</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .schedule-container {
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .schedule-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .schedule-header h1 {
      margin: 0;
      flex: 0 0 auto;
    }

    .header-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-left: auto;
    }

    .group-info-card {
      margin-bottom: 24px;
    }

    .group-info {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-item mat-icon {
      color: #666;
    }

    .schedule-board {
      flex: 1;
      overflow: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .board-wrapper {
      min-width: 100%;
      overflow-x: auto;
    }

    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1000px;
    }

    .schedule-table th,
    .schedule-table td {
      border: 1px solid #e0e0e0;
      padding: 8px;
    }

    .time-header,
    .day-header {
      background: #f5f5f5;
      font-weight: 600;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .time-header {
      width: 120px;
      left: 0;
      z-index: 11;
    }

    .time-cell {
      background: #fafafa;
      text-align: center;
      position: sticky;
      left: 0;
      z-index: 1;
    }

    .time-slot-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .time-range {
      font-size: 0.85em;
      color: #666;
    }

    .schedule-cell {
      vertical-align: top;
      min-height: 80px;
      position: relative;
    }

    .cell-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 60px;
    }

    .hour-block {
      border-radius: 4px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      min-height: 60px;
    }

    .hour-block:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .hour-block.occupied {
      background: #e3f2fd;
      border: 1px solid #1976d2;
    }

    .hour-block.available {
      background: #f1f8e9;
      border: 1px dashed #689f38;
    }

    .hour-block.available:hover {
      background: #dcedc8;
    }

    .session-info {
      text-align: left;
      font-size: 0.85em;
    }

    .course-name {
      font-weight: 600;
      color: #1976d2;
      margin-bottom: 4px;
    }

    .teacher-name,
    .room-name {
      color: #666;
      font-size: 0.9em;
    }

    .session-type-icon {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 18px;
      color: #666;
    }

    .session-menu-button {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .hour-block:hover .session-menu-button {
      opacity: 1;
    }

    .delete-option {
      color: #f44336;
    }

    .empty-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 60px;
    }

    .add-icon {
      color: #689f38;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .hour-block.available:hover .add-icon {
      opacity: 1;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      gap: 16px;
    }

    .empty-state mat-icon {
      font-size: 64px;
      color: #ccc;
    }

    .legend-card {
      margin-top: 24px;
    }

    .legend-items {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-color {
      width: 24px;
      height: 24px;
      border-radius: 4px;
    }

    .legend-color.theory {
      background: #e3f2fd;
      border: 1px solid #1976d2;
    }

    .legend-color.practice {
      background: #fce4ec;
      border: 1px solid #c2185b;
    }

    .legend-color.available {
      background: #f1f8e9;
      border: 1px dashed #689f38;
    }

    .legend-color.occupied {
      background: #f5f5f5;
      border: 1px solid #9e9e9e;
    }

    @media (max-width: 768px) {
      .schedule-container {
        padding: 16px;
      }

      .header-controls {
        flex-direction: column;
      }

      .group-info {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class ScheduleByGroupComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private classSessionService = inject(ClassSessionService);
  private studentGroupService = inject(StudentGroupService);
  private timeSlotService = inject(TimeSlotService);
  private periodService = inject(PeriodService);

  // Form controls
  groupControl = new FormControl<string>('');

  // Data
  studentGroups: StudentGroup[] = [];
  timeSlots: TimeSlot[] = [];
  sessions: ClassSessionResponse[] = [];
  scheduleRows: ScheduleRow[] = [];

  // State
  selectedGroup: StudentGroup | null = null;
  loading = false;
  workingDays = WORKING_DAYS.filter(d => d !== DayOfWeek.SUNDAY);

  ngOnInit(): void {
    this.loadInitialData();
    this.setupGroupSelection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    // Cargar grupos del periodo actual
    const currentPeriod = this.periodService.getCurrentPeriod();
    if (currentPeriod) {
      this.loadStudentGroups();
    }

    // Cargar turnos y horas pedagógicas
    this.loadTimeSlots();
  }

  private loadStudentGroups(): void {
    this.studentGroupService.getAllGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.studentGroups = Array.isArray(response.data) ? response.data : [response.data];
        },
        error: (error) => {
          console.error('Error loading groups:', error);
          this.snackBar.open('Error al cargar los grupos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private loadTimeSlots(): void {
    this.timeSlotService.getAllTimeSlots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.timeSlots = Array.isArray(response.data) ? response.data : [response.data];
          this.buildScheduleGrid();
        },
        error: (error) => {
          console.error('Error loading time slots:', error);
          this.snackBar.open('Error al cargar los turnos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private setupGroupSelection(): void {
    this.groupControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(groupUuid => {
        if (groupUuid) {
          this.selectedGroup = this.studentGroups.find(g => g.uuid === groupUuid) || null;
          if (this.selectedGroup) {
            this.loadGroupSchedule(groupUuid);
          }
        }
      });
  }

  private loadGroupSchedule(groupUuid: string): void {
    this.loading = true;
    this.classSessionService.getSessionsByGroup(groupUuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sessions = Array.isArray(response.data) ? response.data : [response.data];
          this.buildScheduleGrid();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading schedule:', error);
          this.snackBar.open('Error al cargar el horario', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private buildScheduleGrid(): void {
    this.scheduleRows = this.timeSlots.map(timeSlot => {
      const row: ScheduleRow = {
        timeSlot: {
          uuid: timeSlot.uuid,
          name: timeSlot.name,
          teachingHours: timeSlot.teachingHours
        },
        cells: {}
      };

      // Inicializar celdas para cada día
      this.workingDays.forEach(day => {
        row.cells[day] = timeSlot.teachingHours.map(hour => ({
          teachingHour: hour,
          session: this.findSessionForHour(day, hour),
          isAvailable: true, // Por ahora, todas disponibles
          isSelected: false
        }));
      });

      return row;
    });
  }

  private findSessionForHour(day: DayOfWeek, hour: TeachingHourResponse): ClassSessionResponse | undefined {
    return this.sessions.find(session =>
      session.dayOfWeek === day &&
      session.teachingHours.some(h => h.uuid === hour.uuid)
    );
  }

  // UI Methods
  getDayName(day: DayOfWeek): string {
    return DAY_NAMES[day];
  }

  formatTime(time: string): string {
    return time.substring(0, 5); // HH:mm
  }

  hasSessionInCell(row: ScheduleRow, day: DayOfWeek): boolean {
    const cells = row.cells[day] || [];
    return cells.some(cell => cell.session !== undefined);
  }

  getCellsForDay(row: ScheduleRow, day: DayOfWeek): ScheduleCell[] {
    return row.cells[day] || [];
  }

  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      return `${cell.session.course.name}\n${cell.session.teacher.fullName}\n${cell.session.learningSpace.name}`;
    }
    return cell.isAvailable ? 'Click para asignar clase' : 'No disponible';
  }

  getSessionTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  getTotalHours(): number {
    return this.sessions.reduce((total, session) => total + session.totalHours, 0);
  }

  // Actions
  onCellClick(row: ScheduleRow, day: DayOfWeek, cell: ScheduleCell): void {
    if (!cell.session && cell.isAvailable && this.selectedGroup) {
      // Abrir diálogo de asignación
      const selectedHours = this.getConsecutiveHours(row, day, cell);

      const dialogData: AssignmentDialogData = {
        mode: 'create',
        studentGroup: this.selectedGroup,
        dayOfWeek: day,
        teachingHours: selectedHours,
        timeSlotUuid: row.timeSlot.uuid
      };

      const dialogRef = this.dialog.open(AssignmentDialogComponent, {
        width: '700px',
        data: dialogData,
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Recargar el horario
          this.loadGroupSchedule(this.selectedGroup!.uuid);
        }
      });
    }
  }

  editSession(session: ClassSessionResponse): void {
    if (!this.selectedGroup) return;

    const dialogData: AssignmentDialogData = {
      mode: 'edit',
      studentGroup: this.selectedGroup,
      dayOfWeek: session.dayOfWeek,
      teachingHours: session.teachingHours,
      sessionToEdit: session
    };

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '700px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el horario
        this.loadGroupSchedule(this.selectedGroup!.uuid);
      }
    });
  }

  duplicateSession(session: ClassSessionResponse): void {
    // TODO: Implementar duplicación
    this.snackBar.open('Función de duplicar en desarrollo', 'Cerrar', { duration: 2000 });
  }

  deleteSession(session: ClassSessionResponse): void {
    if (confirm(`¿Está seguro de eliminar la clase de ${session.course.name}?`)) {
      this.classSessionService.deleteSession(session.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Clase eliminada exitosamente', 'Cerrar', { duration: 3000 });
            // Recargar el horario
            if (this.selectedGroup) {
              this.loadGroupSchedule(this.selectedGroup.uuid);
            }
          },
          error: (error) => {
            console.error('Error deleting session:', error);
            this.snackBar.open('Error al eliminar la clase', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  openAssignmentDialog(): void {
    if (!this.selectedGroup) return;

    // Abrir diálogo sin preseleccionar hora
    const dialogData: AssignmentDialogData = {
      mode: 'create',
      studentGroup: this.selectedGroup
    };

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '700px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el horario
        this.loadGroupSchedule(this.selectedGroup!.uuid);
      }
    });
  }

  // Helper para obtener horas consecutivas al hacer click
// ✅ ALTERNATIVA: Si quieres permitir selección múltiple manual
  private getConsecutiveHours(row: ScheduleRow, day: DayOfWeek, clickedCell: ScheduleCell): TeachingHourResponse[] {
    // Por ahora, solo devolver la hora seleccionada
    // Más adelante se puede implementar selección múltiple con Ctrl+Click o similar
    return [clickedCell.teachingHour];
  }

  goBack(): void {
    this.router.navigate(['/dashboard/horarios']);
  }
}
