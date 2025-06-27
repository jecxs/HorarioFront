// src/app/features/schedule-assignment/components/schedule-by-teacher/schedule-by-teacher.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';

// Services
import { ClassSessionService } from '../../services/class-session.service';
import { DocenteService } from '../../../teachers/services/docente.service';
import { TimeSlotService, TimeSlot } from '../../../time-slots/services/time-slot.service';
import { TeacherMetadataService } from '../../services/teacher-metadata.service';
import { TeacherAssignmentDialogComponent, TeacherAssignmentDialogData } from '../teacher-assignment-dialog/teacher-assignment-dialog.component';

// Models
import {
  ClassSessionResponse,
  DayOfWeek,
  WORKING_DAYS,
  DAY_NAMES,
  ScheduleHourRow,
  ScheduleCell,
  TeachingHourResponse,
  TimeSlotHelper,
  TeacherResponse,
} from '../../models/class-session.model';

// Components
import { AssignmentDialogComponent, AssignmentDialogData } from '../assignment-dialog/assignment-dialog.component';
import { TeacherMetadataHeaderComponent } from '../teacher-metadata-header/teacher-metadata-header.component';

@Component({
  selector: 'app-schedule-by-teacher',
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
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    TeacherMetadataHeaderComponent,
  ],
  templateUrl: './schedule-by-teacher.component.html',
  styleUrls: ['./schedule-by-teacher.component.scss']
})
export class ScheduleByTeacherComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private classSessionService = inject(ClassSessionService);
  private teacherService = inject(DocenteService);
  private timeSlotService = inject(TimeSlotService);
  private teacherMetadataService = inject(TeacherMetadataService);
  private route = inject(ActivatedRoute);

  // Form controls
  teacherControl = new FormControl<string>('');
  teacherFilterControl = new FormControl('');

  // Data
  teachers: TeacherResponse[] = [];
  filteredTeachers: TeacherResponse[] = [];
  timeSlots: TimeSlot[] = [];
  sessions: ClassSessionResponse[] = [];
  scheduleHourRows: ScheduleHourRow[] = [];

  // State
  selectedTeacher: TeacherResponse | null = null;
  loading = false;
  loadingTeachers = false;
  workingDays = WORKING_DAYS.filter(d => d !== DayOfWeek.SUNDAY);

  // Nuevas propiedades para colapsar turnos
  collapsedTimeSlots: Set<string> = new Set();
  showCollapseControls = true;

  ngOnInit(): void {
    this.loadInitialData();
    this.setupTeacherSelection();
    this.setupTeacherFilter();
    this.handleQueryParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.teacherMetadataService.clearMetadata();
  }

  private loadInitialData(): void {
    this.loadTeachers();
    this.loadTimeSlots();
  }

  private loadTeachers(): void {
    this.loadingTeachers = true;
    this.teacherService.getAllTeachers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teachers = Array.isArray(response.data) ? response.data : [response.data];
          this.filteredTeachers = [...this.teachers];
          this.loadingTeachers = false;
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
          this.showSnackBar('Error al cargar los docentes', 'error');
          this.loadingTeachers = false;
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

  private setupTeacherSelection(): void {
    this.teacherControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        debounceTime(150),
        takeUntil(this.destroy$)
      )
      .subscribe(teacherUuid => {
        if (teacherUuid) {
          this.selectedTeacher = this.teachers.find(t => t.uuid === teacherUuid) || null;
          if (this.selectedTeacher) {
            this.loadTeacherData(teacherUuid);
          }
        } else {
          this.clearTeacherData();
        }
      });
  }

  private setupTeacherFilter(): void {
    this.teacherFilterControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterTeachers(searchTerm || '');
      });
  }

  private filterTeachers(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredTeachers = [...this.teachers];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredTeachers = this.teachers.filter(teacher =>
      teacher.fullName.toLowerCase().includes(term) ||
      teacher.email.toLowerCase().includes(term) ||
      teacher.department.name?.toLowerCase().includes(term)
    );
  }

  private handleQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['teacherUuid']) {
          this.teacherControl.setValue(params['teacherUuid']);
        }
      });
  }

  private loadTeacherData(teacherUuid: string): void {
    this.loading = true;
    console.log('🔄 Loading teacher schedule data for:', teacherUuid);

    this.classSessionService.getSessionsByTeacher(teacherUuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📚 Teacher sessions loaded successfully');
          this.sessions = Array.isArray(response.data) ? response.data : [response.data];

          // Actualizar metadatos del docente
          this.updateTeacherMetadata();

          // Construir grid
          this.buildScheduleGrid();
          this.loading = false;

          console.log('✅ Teacher data processing complete');
        },
        error: (error) => {
          console.error('❌ Error loading teacher data:', error);
          this.showSnackBar('Error al cargar los datos del docente', 'error');
          this.loading = false;
        }
      });
  }

  private updateTeacherMetadata(): void {
    if (!this.selectedTeacher) {
      console.log('⚠️ Cannot update metadata: missing teacher');
      return;
    }

    console.log('📊 Updating teacher metadata...');
    this.teacherMetadataService.updateTeacherScheduleMetadata(
      this.selectedTeacher,
      this.sessions
    );
  }

  private clearTeacherData(): void {
    this.sessions = [];
    this.scheduleHourRows = [];
    this.teacherMetadataService.clearMetadata();
    this.collapsedTimeSlots.clear();
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
    if (this.selectedTeacher) {
      this.autoCollapseEmptyTimeSlots();
    }
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

  // Métodos de UI
  getDayName(day: DayOfWeek): string {
    return DAY_NAMES[day];
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  getCellForDay(row: ScheduleHourRow, day: DayOfWeek): ScheduleCell | undefined {
    return row.cells[day];
  }

  getTimeSlotTooltip(row: ScheduleHourRow): string {
    return `Turno: ${row.timeSlot.name}\n` +
      `Horario: ${this.formatTime(row.timeSlot.startTime)} - ${this.formatTime(row.timeSlot.endTime)}\n` +
      `Hora ${row.teachingHour.orderInTimeSlot} de ${row.totalHoursInTimeSlot}\n` +
      `Duración: ${row.teachingHour.durationMinutes} minutos`;
  }

  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      const session = cell.session;
      return `📚 ${session.course.name}\n` +
        `👥 Grupo: ${session.studentGroup.name}\n` +
        `🏫 ${session.learningSpace.name}\n` +
        `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}\n` +
        `📝 Tipo: ${session.sessionType.name === 'THEORY' ? 'Teórica' : 'Práctica'}\n` +
        `⏱️ ${session.totalHours} hora(s) pedagógica(s)`;
    }

    if (cell.isAvailable) {
      return `➕ Click para asignar clase\n` +
        `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}\n` +
        `⏱️ Duración: ${cell.teachingHour.durationMinutes} minutos`;
    }

    return `🚫 No disponible\n` +
      `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}`;
  }

  getSessionCardClasses(session: ClassSessionResponse): string {
    return session.sessionType.name === 'THEORY' ? 'session-card-theory' : 'session-card-practice';
  }

  getTotalHours(): number {
    return this.sessions.reduce((total, session) => total + session.totalHours, 0);
  }

  getShortName(fullName: string): string {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length <= 2) return fullName;
    return `${names[0]} ${names[names.length - 1]}`;
  }

  // Métodos para colapsar turnos
  private timeSlotHasSessions(timeSlotUuid: string): boolean {
    return this.sessions.some(session =>
      session.teachingHours.some(hour =>
        this.timeSlots.find(ts => ts.uuid === timeSlotUuid)?.teachingHours?.some(th => th.uuid === hour.uuid)
      )
    );
  }

  private autoCollapseEmptyTimeSlots(): void {
    this.collapsedTimeSlots.clear();
    this.timeSlots.forEach(timeSlot => {
      if (!this.timeSlotHasSessions(timeSlot.uuid)) {
        this.collapsedTimeSlots.add(timeSlot.uuid);
      }
    });
  }

  toggleTimeSlotCollapse(timeSlotUuid: string): void {
    if (this.collapsedTimeSlots.has(timeSlotUuid)) {
      this.collapsedTimeSlots.delete(timeSlotUuid);
    } else {
      this.collapsedTimeSlots.add(timeSlotUuid);
    }
  }

  isTimeSlotCollapsed(timeSlotUuid: string): boolean {
    return this.collapsedTimeSlots.has(timeSlotUuid);
  }

  shouldShowRow(row: ScheduleHourRow): boolean {
    return !this.isTimeSlotCollapsed(row.timeSlot.uuid);
  }

  getCollapsedTimeSlotSummary(timeSlotUuid: string): string {
    const timeSlot = this.timeSlots.find(ts => ts.uuid === timeSlotUuid);
    if (!timeSlot) return '';

    const sessionsCount = this.sessions.filter(session =>
      session.teachingHours.some(hour =>
        timeSlot.teachingHours?.some(th => th.uuid === hour.uuid)
      )
    ).length;

    return sessionsCount > 0 ? `${sessionsCount} clases` : 'Sin clases';
  }

  expandAllTimeSlots(): void {
    this.collapsedTimeSlots.clear();
  }

  collapseEmptyTimeSlots(): void {
    this.autoCollapseEmptyTimeSlots();
  }

  getSortedTimeSlots(): any[] {
    return [...this.timeSlots].sort((a, b) => {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }

  onCellClick(row: ScheduleHourRow, day: DayOfWeek, cell: ScheduleCell): void {
    if (!cell.session && cell.isAvailable && this.selectedTeacher) {
      this.openTeacherAssignmentDialog(row, day, cell);
    }
  }

  // ✅ MÉTODO CORREGIDO: Abrir diálogo de asignación para docente
  private openTeacherAssignmentDialog(row: ScheduleHourRow, day: DayOfWeek, cell: ScheduleCell): void {
    const dialogData: TeacherAssignmentDialogData = {
      mode: 'create',
      teacher: this.selectedTeacher!,
      dayOfWeek: day,
      teachingHours: [cell.teachingHour],
      timeSlotUuid: row.timeSlot.uuid
    };

    const dialogRef = this.dialog.open(TeacherAssignmentDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase asignada exitosamente', 'success');
        this.loadTeacherData(this.selectedTeacher!.uuid);
      }
    });
  }

  // ✅ MÉTODO CORREGIDO: Nuevo método para crear clase (desde botón)
  openNewAssignmentDialog(): void {
    if (!this.selectedTeacher) {
      this.showSnackBar('Debe seleccionar un docente primero', 'warning');
      return;
    }

    const dialogData: TeacherAssignmentDialogData = {
      mode: 'create',
      teacher: this.selectedTeacher
      // No especificamos día ni horas, el usuario elegirá en el diálogo
    };

    const dialogRef = this.dialog.open(TeacherAssignmentDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase asignada exitosamente', 'success');
        this.loadTeacherData(this.selectedTeacher!.uuid);
      }
    });
  }

  editSession(session: ClassSessionResponse): void {
    if (!this.selectedTeacher) return;

    const dialogData: AssignmentDialogData = {
      mode: 'edit',
      studentGroup: session.studentGroup,
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
        this.loadTeacherData(this.selectedTeacher!.uuid);
      }
    });
  }

  deleteSession(session: ClassSessionResponse): void {
    if (!confirm('¿Está seguro de que desea eliminar esta clase?')) {
      return;
    }

    this.classSessionService.deleteSession(session.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSnackBar('Clase eliminada exitosamente', 'success');
          this.loadTeacherData(this.selectedTeacher!.uuid);
        },
        error: (error) => {
          console.error('Error deleting session:', error);
          this.showSnackBar('Error al eliminar la clase', 'error');
        }
      });
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/horarios']);
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
}
