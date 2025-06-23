// schedule-by-group.component.ts - Versión Minimalista
import { Component, OnInit, OnDestroy, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

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
  ScheduleHourRow,
  ScheduleCell,
  TeachingHourResponse,
  TimeSlotHelper
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
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule
  ],
  templateUrl: './schedule-by-group.component.html',
  styleUrls: ['./schedule-by-group.component.scss']
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
  scheduleHourRows: ScheduleHourRow[] = [];

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
    const currentPeriod = this.periodService.getCurrentPeriod();
    if (currentPeriod) {
      this.loadStudentGroups();
    }
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
          this.showSnackBar('Error al cargar los grupos', 'error');
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
          this.showSnackBar('Error al cargar los turnos', 'error');
        }
      });
  }

  private setupGroupSelection(): void {
    this.groupControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        debounceTime(150), // Reducido para ser más responsivo
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
          this.showSnackBar('Error al cargar el horario', 'error');
          this.loading = false;
        }
      });
  }

  private buildScheduleGrid(): void {
    if (!this.timeSlots || this.timeSlots.length === 0) {
      this.scheduleHourRows = [];
      return;
    }

    const processedTimeSlots = TimeSlotHelper.sortTimeSlots(this.timeSlots);
    const hourRows: ScheduleHourRow[] = [];

    processedTimeSlots.forEach(timeSlot => {
      timeSlot.sortedHours.forEach((hour, hourIndex) => {
        const row: ScheduleHourRow = {
          teachingHour: hour,
          timeSlot: {
            uuid: timeSlot.uuid,
            name: timeSlot.name,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime
          },
          isFirstHourOfTimeSlot: hourIndex === 0,
          isLastHourOfTimeSlot: hourIndex === timeSlot.sortedHours.length - 1,
          hourIndexInTimeSlot: hourIndex,
          totalHoursInTimeSlot: timeSlot.sortedHours.length,
          cells: {}
        };

        this.workingDays.forEach(day => {
          row.cells[day] = {
            teachingHour: hour,
            session: this.findSessionForHour(day, hour),
            isAvailable: this.isCellAvailable(day, hour),
            isSelected: false
          };
        });

        hourRows.push(row);
      });
    });

    this.scheduleHourRows = hourRows;
  }

  private findSessionForHour(day: DayOfWeek, hour: TeachingHourResponse): ClassSessionResponse | undefined {
    return this.sessions.find(session =>
      session.dayOfWeek === day &&
      session.teachingHours.some(h => h.uuid === hour.uuid)
    );
  }

  private isCellAvailable(day: DayOfWeek, hour: TeachingHourResponse): boolean {
    return !this.findSessionForHour(day, hour);
  }

  // ===== MÉTODOS DE UI =====

  getDayName(day: DayOfWeek): string {
    return DAY_NAMES[day];
  }

  getDayIcon(day: DayOfWeek): string {
    const dayIcons: Record<DayOfWeek, string> = {
      [DayOfWeek.MONDAY]: 'today',
      [DayOfWeek.TUESDAY]: 'event',
      [DayOfWeek.WEDNESDAY]: 'schedule',
      [DayOfWeek.THURSDAY]: 'access_time',
      [DayOfWeek.FRIDAY]: 'event_available',
      [DayOfWeek.SATURDAY]: 'weekend',
      [DayOfWeek.SUNDAY]: 'calendar_month'
    };
    return dayIcons[day] || 'calendar_month';
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  getCellForDay(row: ScheduleHourRow, day: DayOfWeek): ScheduleCell | undefined {
    return row.cells[day];
  }

  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      const session = cell.session;
      return `${session.course.name}\n${session.teacher.fullName}\n${session.learningSpace.name}\n${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}`;
    }

    if (cell.isAvailable) {
      return `Click para asignar clase\n${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}`;
    }

    return `No disponible\n${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}`;
  }

  getSessionCardClasses(session: ClassSessionResponse): string {
    return session.sessionType.name === 'THEORY' ? 'session-card-theory' : 'session-card-practice';
  }

  getSessionTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  getTotalHours(): number {
    return this.sessions.reduce((total, session) => total + session.totalHours, 0);
  }

  shouldShowTimeSlotName(row: ScheduleHourRow): boolean {
    return row.isFirstHourOfTimeSlot;
  }

  // ✅ NUEVO: Método para acortar nombres largos
  getShortName(fullName: string): string {
    const names = fullName.split(' ');
    if (names.length <= 2) return fullName;
    return `${names[0]} ${names[names.length - 1]}`;
  }

  // ===== MÉTODOS DE ACCIÓN =====

  onCellClick(row: ScheduleHourRow, day: DayOfWeek, cell: ScheduleCell): void {
    if (!cell.session && cell.isAvailable && this.selectedGroup) {
      const dialogData: AssignmentDialogData = {
        mode: 'create',
        studentGroup: this.selectedGroup,
        dayOfWeek: day,
        teachingHours: [cell.teachingHour],
        timeSlotUuid: row.timeSlot.uuid
      };

      const dialogRef = this.dialog.open(AssignmentDialogComponent, {
        width: '700px',
        maxWidth: '90vw',
        data: dialogData,
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.showSnackBar('Clase asignada exitosamente', 'success');
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
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase actualizada exitosamente', 'success');
        this.loadGroupSchedule(this.selectedGroup!.uuid);
      }
    });
  }

  deleteSession(session: ClassSessionResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de eliminar la clase de "${session.course.name}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performDeleteSession(session);
      }
    });
  }

  private performDeleteSession(session: ClassSessionResponse): void {
    this.classSessionService.deleteSession(session.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSnackBar('Clase eliminada exitosamente', 'success');
          this.loadGroupSchedule(this.selectedGroup!.uuid);
        },
        error: (error) => {
          console.error('Error deleting session:', error);
          this.showSnackBar('Error al eliminar la clase', 'error');
        }
      });
  }

  openAssignmentDialog(): void {
    if (!this.selectedGroup) return;

    const dialogData: AssignmentDialogData = {
      mode: 'create',
      studentGroup: this.selectedGroup
    };

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase asignada exitosamente', 'success');
        this.loadGroupSchedule(this.selectedGroup!.uuid);
      }
    });
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/horarios']);
  }
}

// ===== COMPONENTE DE CONFIRMACIÓN SIMPLE =====
interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="p-6">
      <h2 class="text-lg font-semibold mb-3" [class]="getTitleClass()">{{ data.title }}</h2>
      <p class="text-slate-600 mb-6">{{ data.message }}</p>
      <div class="flex space-x-3 justify-end">
        <button mat-button (click)="onCancel()" class="text-slate-600">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button
                [color]="getButtonColor()"
                (click)="onConfirm()">
          {{ data.confirmText }}
        </button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule]
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getTitleClass(): string {
    const classes = {
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600'
    };
    return classes[this.data.type] || 'text-slate-800';
  }

  getButtonColor(): string {
    const colors = {
      danger: 'warn',
      warning: 'accent',
      info: 'primary'
    };
    return colors[this.data.type] || 'primary';
  }
}
