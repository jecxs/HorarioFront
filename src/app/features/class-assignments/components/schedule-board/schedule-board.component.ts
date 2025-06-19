// src/app/features/class-assignments/components/schedule-board/schedule-board.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, debounceTime, distinctUntilChanged, startWith, switchMap, of } from 'rxjs';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// CDK
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';

// Services
import {
  ClassAssignmentService,
  ClassSession,
  Course,
  Teacher,
  StudentGroup,
  TimeSlot,
  LearningSpace,
  TeachingHour,
  ValidationResult,
  IntelliSenseResult
} from '../../services/class-assignment.service';

// Components
import { ClassSessionDialogComponent } from '../class-session-dialog/class-session-dialog.component';
import { SmartFiltersComponent } from '../smart-filters/smart-filters.component';
import { ConflictIndicatorComponent } from '../conflict-indicator/conflict-indicator.component';

// Utils
import { ScheduleUtils } from '../../utils/schedule.utils';

interface ScheduleCell {
  timeSlot: TimeSlot;
  teachingHour: TeachingHour;
  dayOfWeek: string;
  session?: ClassSession;
  isAvailable: boolean;
  hasConflict: boolean;
  suggestions: string[];
  isHighlighted: boolean;
  isSelected: boolean;
  intelliSenseData?: IntelliSenseResult;
}

interface ScheduleView {
  mode: 'TEACHER' | 'GROUP' | 'SPACE' | 'GLOBAL';
  selectedEntity?: Teacher | StudentGroup | LearningSpace;
  weekView: boolean;
  showConflicts: boolean;
  showSuggestions: boolean;
  showIntelliSense: boolean;
}

@Component({
  selector: 'app-schedule-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatButtonToggleModule,
    DragDropModule,
    OverlayModule,
    SmartFiltersComponent,
    ConflictIndicatorComponent
  ],
  templateUrl: './schedule-board.component.html',
  styleUrls: ['./schedule-board.component.scss']
})
export class ScheduleBoardComponent implements OnInit, OnDestroy {
  @ViewChild('scheduleGrid', { static: true }) scheduleGrid!: ElementRef;

  private destroy$ = new Subject<void>();
  private classAssignmentService = inject(ClassAssignmentService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // Forms
  viewForm!: FormGroup;
  quickAssignForm!: FormGroup;

  // Data
  scheduleMatrix: ScheduleCell[][] = [];
  timeSlots: TimeSlot[] = [];
  classSessions: ClassSession[] = [];
  availableCourses: Course[] = [];
  eligibleTeachers: Teacher[] = [];
  eligibleSpaces: LearningSpace[] = [];
  studentGroups: StudentGroup[] = [];
  teachingHours: TeachingHour[] = [];

  // View configuration
  scheduleView: ScheduleView = {
    mode: 'GLOBAL',
    weekView: true,
    showConflicts: true,
    showSuggestions: true,
    showIntelliSense: true
  };

  // State
  loading = false;
  isIntelliSenseEnabled = true;
  draggedSession: ClassSession | null = null;
  hoveredCell: ScheduleCell | null = null;
  selectedCells: ScheduleCell[] = [];
  validationResults: Map<string, ValidationResult> = new Map();
  intelliSenseCache: Map<string, IntelliSenseResult> = new Map();

  // Statistics
  scheduleStatistics: any = {};

  // Constants
  readonly daysOfWeek = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'
  ];

  readonly dayLabels = {
    'MONDAY': 'Lunes',
    'TUESDAY': 'Martes',
    'WEDNESDAY': 'Miércoles',
    'THURSDAY': 'Jueves',
    'FRIDAY': 'Viernes'
  };

  readonly viewModes = [
    { value: 'GLOBAL', label: 'Vista Global', icon: 'dashboard' },
    { value: 'TEACHER', label: 'Por Docente', icon: 'person' },
    { value: 'GROUP', label: 'Por Grupo', icon: 'group' },
    { value: 'SPACE', label: 'Por Aula', icon: 'room' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.loadInitialData();
    this.setupIntelliSense();
    this.setupRealTimeValidation();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.viewForm = this.fb.group({
      mode: ['GLOBAL'],
      selectedEntity: [''],
      periodFilter: [''],
      showConflicts: [true],
      showSuggestions: [true],
      showIntelliSense: [true],
      weekView: [true]
    });

    this.quickAssignForm = this.fb.group({
      course: ['', Validators.required],
      teacher: ['', Validators.required],
      group: ['', Validators.required],
      space: ['', Validators.required],
      dayOfWeek: ['', Validators.required],
      timeSlot: ['', Validators.required],
      sessionType: ['', Validators.required],
      notes: ['']
    });

    // Escuchar cambios en el formulario de vista
    this.viewForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        this.scheduleView = { ...this.scheduleView, ...values };
        this.refreshScheduleView();
      });
  }

  private loadInitialData(): void {
    this.loading = true;

    combineLatest([
      this.classAssignmentService.getAllTimeSlots(),
      this.classAssignmentService.getAllClassSessions(),
      this.classAssignmentService.getAllStudentGroups(),
      this.classAssignmentService.getAllCourses(),
      this.classAssignmentService.getAllTeachers(),
      this.classAssignmentService.getAllLearningSpaces(),
      this.classAssignmentService.getAllTeachingHours()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([timeSlotsRes, sessionsRes, groupsRes, coursesRes, teachersRes, spacesRes, hoursRes]) => {
          this.timeSlots = this.extractData(timeSlotsRes);
          this.classSessions = this.extractData(sessionsRes);
          this.studentGroups = this.extractData(groupsRes);
          this.availableCourses = this.extractData(coursesRes);
          this.eligibleTeachers = this.extractData(teachersRes);
          this.eligibleSpaces = this.extractData(spacesRes);
          this.teachingHours = this.extractData(hoursRes);

          this.buildScheduleMatrix();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar datos iniciales:', error);
          this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private extractData<T>(response: any): T[] {
    if (response?.success) {
      return Array.isArray(response.data) ? response.data : [response.data];
    }
    return [];
  }

  private buildScheduleMatrix(): void {
    this.scheduleMatrix = [];

    this.timeSlots.forEach(timeSlot => {
      const timeSlotHours = this.teachingHours.filter(hour => hour.timeSlot.uuid === timeSlot.uuid);

      timeSlotHours.forEach(hour => {
        const row: ScheduleCell[] = [];

        this.daysOfWeek.forEach(day => {
          const existingSession = this.findSessionForCell(day, hour);

          const cell: ScheduleCell = {
            timeSlot,
            teachingHour: hour,
            dayOfWeek: day,
            session: existingSession,
            isAvailable: !existingSession,
            hasConflict: this.checkCellConflict(day, hour, existingSession),
            suggestions: this.generateCellSuggestions(day, hour, existingSession),
            isHighlighted: false,
            isSelected: false
          };

          row.push(cell);
        });

        this.scheduleMatrix.push(row);
      });
    });
  }

  private findSessionForCell(dayOfWeek: string, hour: TeachingHour): ClassSession | undefined {
    return this.classSessions.find(session =>
      session.dayOfWeek === dayOfWeek &&
      session.teachingHours.some(sessionHour => sessionHour.uuid === hour.uuid)
    );
  }

  private checkCellConflict(dayOfWeek: string, hour: TeachingHour, session?: ClassSession): boolean {
    if (!session) return false;

    // Buscar conflictos de tiempo con otras sesiones
    const conflictingSessions = this.classSessions.filter(otherSession =>
      otherSession.uuid !== session.uuid &&
      otherSession.dayOfWeek === dayOfWeek &&
      otherSession.teachingHours.some(otherHour =>
        ScheduleUtils.doTimeRangesOverlap(
          hour.startTime, hour.endTime,
          otherHour.startTime, otherHour.endTime
        )
      ) &&
      (
        otherSession.teacher.uuid === session.teacher.uuid ||
        otherSession.learningSpace.uuid === session.learningSpace.uuid ||
        otherSession.studentGroup.uuid === session.studentGroup.uuid
      )
    );

    return conflictingSessions.length > 0;
  }

  private generateCellSuggestions(dayOfWeek: string, hour: TeachingHour, session?: ClassSession): string[] {
    const suggestions: string[] = [];

    if (!session) {
      // Sugerencias para celdas vacías
      if (ScheduleUtils.isOptimalTime(hour)) {
        suggestions.push('Horario pedagógicamente óptimo');
      }

      const availableTeachersCount = this.getAvailableTeachersForHour(dayOfWeek, hour).length;
      if (availableTeachersCount > 0) {
        suggestions.push(`${availableTeachersCount} docentes disponibles`);
      }
    } else {
      // Sugerencias para celdas ocupadas
      const workload = ScheduleUtils.calculateTeacherWorkload(session.teacher, this.classSessions);
      if (workload.totalHours > 20) {
        suggestions.push('Docente con alta carga horaria');
      }

      const spaceOccupancy = ScheduleUtils.calculateSpaceOccupancy(session.learningSpace, this.classSessions);
      if (spaceOccupancy.occupancyRate > 80) {
        suggestions.push('Aula con alta ocupación');
      }
    }

    return suggestions;
  }

  private getAvailableTeachersForHour(dayOfWeek: string, hour: TeachingHour): Teacher[] {
    return this.eligibleTeachers.filter(teacher => {
      // Verificar si el docente no tiene clases en esta hora
      const hasConflict = this.classSessions.some(session =>
        session.teacher.uuid === teacher.uuid &&
        session.dayOfWeek === dayOfWeek &&
        session.teachingHours.some(sessionHour => sessionHour.uuid === hour.uuid)
      );
      return !hasConflict;
    });
  }

  private setupIntelliSense(): void {
    // Configurar IntelliSense reactivo
    combineLatest([
      this.quickAssignForm.get('course')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('group')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('dayOfWeek')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('timeSlot')!.valueChanges.pipe(startWith(''))
    ]).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(([courseUuid, groupUuid, dayOfWeek, timeSlotUuid]) => {
        if (courseUuid || groupUuid || (dayOfWeek && timeSlotUuid)) {
          return this.classAssignmentService.getIntelliSense(courseUuid, groupUuid, dayOfWeek, timeSlotUuid);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(intelliSense => {
      if (intelliSense) {
        this.updateIntelliSenseResults(intelliSense);
      }
    });
  }

  private updateIntelliSenseResults(intelliSense: IntelliSenseResult): void {
    // Actualizar docentes elegibles
    if (intelliSense.eligibleTeachers) {
      this.eligibleTeachers = intelliSense.eligibleTeachers;
    }

    // Actualizar aulas elegibles
    if (intelliSense.eligibleSpaces) {
      this.eligibleSpaces = intelliSense.eligibleSpaces;
    }

    // Mostrar recomendaciones
    if (intelliSense.recommendations && intelliSense.recommendations.length > 0) {
      this.snackBar.open(
        `💡 ${intelliSense.recommendations[0]}`,
        'Cerrar',
        { duration: 4000, panelClass: 'snack-info' }
      );
    }

    // Mostrar advertencias
    if (intelliSense.warnings && intelliSense.warnings.length > 0) {
      this.snackBar.open(
        `⚠️ ${intelliSense.warnings[0]}`,
        'Cerrar',
        { duration: 5000, panelClass: 'snack-warning' }
      );
    }

    this.cdr.detectChanges();
  }

  private setupRealTimeValidation(): void {
    // Validación en tiempo real del formulario de asignación rápida
    this.quickAssignForm.valueChanges
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap(formValue => {
          if (this.isFormReadyForValidation(formValue)) {
            return this.classAssignmentService.validateAssignmentInRealTime(
              formValue.course,
              formValue.teacher,
              formValue.space,
              formValue.group,
              formValue.dayOfWeek,
              [formValue.timeSlot] // Simplificado para el ejemplo
            );
          }
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(validation => {
        if (validation) {
          this.handleValidationResult(validation);
        }
      });
  }

  private isFormReadyForValidation(formValue: any): boolean {
    return formValue.course && formValue.teacher && formValue.space &&
      formValue.group && formValue.dayOfWeek && formValue.timeSlot;
  }

  private handleValidationResult(validation: ValidationResult): void {
    // Limpiar validaciones previas
    this.clearValidationMessages();

    if (!validation.isValid && validation.errors.length > 0) {
      this.snackBar.open(
        `❌ ${validation.errors[0]}`,
        'Cerrar',
        { duration: 4000, panelClass: 'snack-error' }
      );
    }

    if (validation.warnings.length > 0) {
      this.snackBar.open(
        `⚠️ ${validation.warnings[0]}`,
        'Ver más',
        { duration: 6000, panelClass: 'snack-warning' }
      );
    }

    if (validation.suggestions.length > 0) {
      this.snackBar.open(
        `💡 ${validation.suggestions[0]}`,
        'Cerrar',
        { duration: 5000, panelClass: 'snack-info' }
      );
    }
  }

  private clearValidationMessages(): void {
    this.snackBar.dismiss();
  }

  private loadStatistics(): void {
    this.classAssignmentService.getScheduleStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.scheduleStatistics = stats;
        this.cdr.detectChanges();
      });
  }

  private refreshScheduleView(): void {
    // Filtrar datos según el modo de vista seleccionado
    switch (this.scheduleView.mode) {
      case 'TEACHER':
        if (this.scheduleView.selectedEntity) {
          this.filterByTeacher(this.scheduleView.selectedEntity as Teacher);
        }
        break;
      case 'GROUP':
        if (this.scheduleView.selectedEntity) {
          this.filterByGroup(this.scheduleView.selectedEntity as StudentGroup);
        }
        break;
      case 'SPACE':
        if (this.scheduleView.selectedEntity) {
          this.filterBySpace(this.scheduleView.selectedEntity as LearningSpace);
        }
        break;
      default:
        this.buildScheduleMatrix();
    }
  }

  private filterByTeacher(teacher: Teacher): void {
    const teacherSessions = this.classSessions.filter(session =>
      session.teacher.uuid === teacher.uuid
    );
    this.highlightSessions(teacherSessions);
  }

  private filterByGroup(group: StudentGroup): void {
    const groupSessions = this.classSessions.filter(session =>
      session.studentGroup.uuid === group.uuid
    );
    this.highlightSessions(groupSessions);
  }

  private filterBySpace(space: LearningSpace): void {
    const spaceSessions = this.classSessions.filter(session =>
      session.learningSpace.uuid === space.uuid
    );
    this.highlightSessions(spaceSessions);
  }

  private highlightSessions(sessions: ClassSession[]): void {
    // Limpiar highlights previos
    this.scheduleMatrix.forEach(row => {
      row.forEach(cell => {
        cell.isHighlighted = false;
      });
    });

    // Aplicar nuevos highlights
    sessions.forEach(session => {
      this.scheduleMatrix.forEach(row => {
        row.forEach(cell => {
          if (cell.session?.uuid === session.uuid) {
            cell.isHighlighted = true;
          }
        });
      });
    });

    this.cdr.detectChanges();
  }

  // ====== EVENT HANDLERS ======

  onCellClick(cell: ScheduleCell): void {
    if (cell.session) {
      this.editSession(cell.session);
    } else {
      this.createSessionInCell(cell);
    }
  }

  onCellHover(cell: ScheduleCell): void {
    this.hoveredCell = cell;

    if (this.isIntelliSenseEnabled && !cell.session) {
      this.loadCellIntelliSense(cell);
    }
  }

  onCellLeave(): void {
    this.hoveredCell = null;
  }

  onCellSelect(cell: ScheduleCell, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      // Selección múltiple
      const index = this.selectedCells.findIndex(c =>
        c.dayOfWeek === cell.dayOfWeek && c.teachingHour.uuid === cell.teachingHour.uuid
      );

      if (index > -1) {
        this.selectedCells.splice(index, 1);
        cell.isSelected = false;
      } else {
        this.selectedCells.push(cell);
        cell.isSelected = true;
      }
    } else {
      // Selección única
      this.clearSelection();
      this.selectedCells = [cell];
      cell.isSelected = true;
    }
  }

  private clearSelection(): void {
    this.selectedCells.forEach(cell => cell.isSelected = false);
    this.selectedCells = [];
  }

  private loadCellIntelliSense(cell: ScheduleCell): void {
    const cacheKey = `${cell.dayOfWeek}-${cell.teachingHour.uuid}`;

    if (this.intelliSenseCache.has(cacheKey)) {
      cell.intelliSenseData = this.intelliSenseCache.get(cacheKey);
      return;
    }

    this.classAssignmentService.getIntelliSense(
      undefined, // courseUuid
      undefined, // groupUuid
      cell.dayOfWeek,
      cell.timeSlot.uuid
    ).subscribe(intelliSense => {
      cell.intelliSenseData = intelliSense;
      this.intelliSenseCache.set(cacheKey, intelliSense);
      this.cdr.detectChanges();
    });
  }

  // ====== SESSION MANAGEMENT ======

  createSessionInCell(cell: ScheduleCell): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      data: {
        isNew: true,
        prefilledData: {
          dayOfWeek: cell.dayOfWeek,
          timeSlot: cell.timeSlot,
          teachingHour: cell.teachingHour
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createSession(result);
      }
    });
  }

  editSession(session: ClassSession): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      data: {
        isNew: false,
        session: session
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateSession(session.uuid, result);
      }
    });
  }

  private createSession(sessionData: any): void {
    this.loading = true;

    this.classAssignmentService.createClassSession(sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('✅ Sesión creada exitosamente', 'Cerrar', { duration: 2000 });
            this.loadInitialData();
          }
        },
        error: (error) => {
          console.error('Error al crear sesión:', error);
          this.snackBar.open(
            `❌ ${error.error?.message || 'Error al crear la sesión'}`,
            'Cerrar',
            { duration: 4000 }
          );
          this.loading = false;
        }
      });
  }

  private updateSession(uuid: string, sessionData: any): void {
    this.loading = true;

    this.classAssignmentService.updateClassSession(uuid, sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('✅ Sesión actualizada exitosamente', 'Cerrar', { duration: 2000 });
            this.loadInitialData();
          }
        },
        error: (error) => {
          console.error('Error al actualizar sesión:', error);
          this.snackBar.open(
            `❌ ${error.error?.message || 'Error al actualizar la sesión'}`,
            'Cerrar',
            { duration: 4000 }
          );
          this.loading = false;
        }
      });
  }

  deleteSession(session: ClassSession, event: Event): void {
    event.stopPropagation();

    const confirmation = confirm(
      `¿Está seguro de eliminar la sesión de ${session.course.name}?\n\n` +
      `Docente: ${session.teacher.firstName} ${session.teacher.lastName}\n` +
      `Día: ${this.dayLabels[session.dayOfWeek as keyof typeof this.dayLabels]}\n` +
      `Aula: ${session.learningSpace.name}`
    );

    if (confirmation) {
      this.classAssignmentService.deleteClassSession(session.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('✅ Sesión eliminada exitosamente', 'Cerrar', { duration: 2000 });
              this.loadInitialData();
            }
          },
          error: (error) => {
            console.error('Error al eliminar sesión:', error);
            this.snackBar.open('❌ Error al eliminar la sesión', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  // ====== DRAG & DROP ======

  onSessionDragStart(session: ClassSession): void {
    this.draggedSession = session;
  }

  onCellDrop(event: CdkDragDrop<any>, targetCell: ScheduleCell): void {
    if (this.draggedSession && !targetCell.session) {
      this.moveSessionToCell(this.draggedSession, targetCell);
    }
    this.draggedSession = null;
  }

  private moveSessionToCell(session: ClassSession, targetCell: ScheduleCell): void {
    const updatedSession = {
      ...session,
      dayOfWeek: targetCell.dayOfWeek,
      teachingHourUuids: [targetCell.teachingHour.uuid]
    };

    this.updateSession(session.uuid, updatedSession);
  }

  // ====== QUICK ASSIGN ======

  onQuickAssign(): void {
    if (this.quickAssignForm.valid) {
      const formValue = this.quickAssignForm.value;

      const sessionData = {
        courseUuid: formValue.course,
        teacherUuid: formValue.teacher,
        learningSpaceUuid: formValue.space,
        studentGroupUuid: formValue.group,
        sessionTypeUuid: formValue.sessionType,
        dayOfWeek: formValue.dayOfWeek,
        teachingHourUuids: [formValue.timeSlot],
        notes: formValue.notes || ''
      };

      this.createSession(sessionData);
      this.quickAssignForm.reset();
    } else {
      this.snackBar.open('⚠️ Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
    }
  }

  // ====== UTILITY METHODS ======

  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      const session = cell.session;
      return `${session.course.name}\n` +
        `${session.teacher.firstName} ${session.teacher.lastName}\n` +
        `${session.learningSpace.name}\n` +
        `${ScheduleUtils.formatTimeRange(cell.teachingHour.startTime, cell.teachingHour.endTime)}`;
    } else {
      let tooltip = `${this.dayLabels[cell.dayOfWeek as keyof typeof this.dayLabels]}\n`;
      tooltip += `${ScheduleUtils.formatTimeRange(cell.teachingHour.startTime, cell.teachingHour.endTime)}\n`;

      if (cell.suggestions.length > 0) {
        tooltip += `\n💡 ${cell.suggestions.join('\n💡 ')}`;
      }

      return tooltip;
    }
  }

  getCellClasses(cell: ScheduleCell): string {
    const classes = ['schedule-cell'];

    if (cell.session) {
      classes.push('occupied');
      classes.push(`course-${cell.session.sessionType.name.toLowerCase()}`);
    } else {
      classes.push('available');
    }

    if (cell.hasConflict) classes.push('conflict');
    if (cell.isHighlighted) classes.push('highlighted');
    if (cell.isSelected) classes.push('selected');
    if (cell.isAvailable && ScheduleUtils.isOptimalTime(cell.teachingHour)) {
      classes.push('optimal-time');
    }

    return classes.join(' ');
  }

  getSessionDisplayText(session: ClassSession): string {
    return `${session.course.code}\n${session.teacher.lastName}`;
  }

  getCourseTypeColor(course: Course): string {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'accent';
    if (hasPractice) return 'warn';
    return 'primary';
  }

  getCourseTypeText(course: Course): string {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'Mixto';
    if (hasPractice) return 'Práctico';
    return 'Teórico';
  }

  refreshData(): void {
    this.loadInitialData();
    this.loadStatistics();
  }

  exportSchedule(): void {
    // Implementar exportación del horario
    this.snackBar.open('🚧 Función de exportación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  printSchedule(): void {
    window.print();
  }

  // ====== GETTERS FOR TEMPLATE ======

  get currentModeLabel(): string {
    return this.viewModes.find(mode => mode.value === this.scheduleView.mode)?.label || 'Vista Global';
  }

  get currentModeIcon(): string {
    return this.viewModes.find(mode => mode.value === this.scheduleView.mode)?.icon || 'dashboard';
  }

  get conflictsCount(): number {
    return this.scheduleMatrix.flat().filter(cell => cell.hasConflict).length;
  }

  get occupancyPercentage(): number {
    const totalCells = this.scheduleMatrix.flat().length;
    const occupiedCells = this.scheduleMatrix.flat().filter(cell => cell.session).length;
    return totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0;
  }
}

