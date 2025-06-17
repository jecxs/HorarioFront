// src/app/features/class-assignments/components/schedule-board/schedule-board.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

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
  ValidationResult
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
}

interface ScheduleView {
  mode: 'TEACHER' | 'GROUP' | 'SPACE' | 'GLOBAL';
  selectedEntity?: Teacher | StudentGroup | LearningSpace;
  weekView: boolean;
  showConflicts: boolean;
  showSuggestions: boolean;
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

  // View configuration
  scheduleView: ScheduleView = {
    mode: 'GLOBAL',
    weekView: true,
    showConflicts: true,
    showSuggestions: true
  };

  // State
  loading = false;
  isIntelliSenseEnabled = true;
  draggedSession: ClassSession | null = null;
  hoveredCell: ScheduleCell | null = null;
  selectedCells: ScheduleCell[] = [];
  validationResults: Map<string, ValidationResult> = new Map();

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

  ngOnInit(): void {
    this.initializeForms();
    this.loadInitialData();
    this.setupIntelliSense();
    this.setupRealTimeValidation();
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
      weekView: [true]
    });

    this.quickAssignForm = this.fb.group({
      course: [''],
      teacher: [''],
      group: [''],
      space: [''],
      dayOfWeek: [''],
      timeSlot: [''],
      sessionType: [''],
      notes: ['']
    });
  }

  private loadInitialData(): void {
    this.loading = true;

    combineLatest([
      this.classAssignmentService.getAllTimeSlots(),
      this.classAssignmentService.getAllClassSessions(),
      this.classAssignmentService.getAllStudentGroups(),
      this.classAssignmentService.getAllCourses()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([timeSlotsRes, sessionsRes, groupsRes, coursesRes]) => {
          this.timeSlots = Array.isArray(timeSlotsRes.data) ? timeSlotsRes.data : [timeSlotsRes.data];
          this.classSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [sessionsRes.data];
          this.studentGroups = Array.isArray(groupsRes.data) ? groupsRes.data : [groupsRes.data];
          this.availableCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [coursesRes.data];

          this.buildScheduleMatrix();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          this.snackBar.open('Error al cargar los datos del horario', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private setupIntelliSense(): void {
    // Configurar filtros inteligentes basados en selecciones
    this.quickAssignForm.get('course')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(courseUuid => {
        if (courseUuid) {
          this.onCourseSelected(courseUuid);
        }
      });

    // Escuchar cambios en el grupo para filtrar cursos compatibles
    this.quickAssignForm.get('group')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(groupUuid => {
        if (groupUuid) {
          this.onGroupSelected(groupUuid);
        }
      });

    // IntelliSense para día y turno
    this.quickAssignForm.get('dayOfWeek')?.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateAvailableHours();
      });
  }

  private setupRealTimeValidation(): void {
    // Validación en tiempo real de toda la asignación
    combineLatest([
      this.quickAssignForm.get('course')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('teacher')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('space')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('group')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('dayOfWeek')!.valueChanges.pipe(startWith(''))
    ]).pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(([courseUuid, teacherUuid, spaceUuid, groupUuid, dayOfWeek]) => {
      if (courseUuid && teacherUuid && spaceUuid && groupUuid && dayOfWeek) {
        this.validateCurrentSelection();
      }
    });
  }

  private buildScheduleMatrix(): void {
    this.scheduleMatrix = [];

    this.timeSlots.forEach(timeSlot => {
      timeSlot.teachingHours.forEach(teachingHour => {
        const row: ScheduleCell[] = [];

        this.daysOfWeek.forEach(dayOfWeek => {
          const existingSession = this.findSessionInCell(dayOfWeek, teachingHour);

          const cell: ScheduleCell = {
            timeSlot,
            teachingHour,
            dayOfWeek,
            session: existingSession,
            isAvailable: !existingSession,
            hasConflict: false,
            suggestions: []
          };

          row.push(cell);
        });

        this.scheduleMatrix.push(row);
      });
    });

    this.detectConflicts();
  }

  private findSessionInCell(dayOfWeek: string, teachingHour: TeachingHour): ClassSession | undefined {
    return this.classSessions.find(session =>
      session.dayOfWeek === dayOfWeek &&
      session.teachingHours.some(hour => hour.uuid === teachingHour.uuid)
    );
  }

  private detectConflicts(): void {
    this.scheduleMatrix.forEach(row => {
      row.forEach(cell => {
        if (cell.session) {
          // Verificar conflictos básicos
          cell.hasConflict = this.hasScheduleConflict(cell);
        }
      });
    });
  }

  private hasScheduleConflict(cell: ScheduleCell): boolean {
    if (!cell.session) return false;

    // Buscar otras sesiones en el mismo horario
    const conflictingSessions = this.classSessions.filter(session =>
      session.uuid !== cell.session!.uuid &&
      session.dayOfWeek === cell.dayOfWeek &&
      (
        // Mismo docente
        session.teacher.uuid === cell.session!.teacher.uuid ||
        // Mismo aula
        session.learningSpace.uuid === cell.session!.learningSpace.uuid ||
        // Mismo grupo
        session.studentGroup.uuid === cell.session!.studentGroup.uuid
      ) &&
      // Misma hora pedagógica
      session.teachingHours.some(hour =>
        cell.session!.teachingHours.some(cellHour => cellHour.uuid === hour.uuid)
      )
    );

    return conflictingSessions.length > 0;
  }

  // === EVENT HANDLERS ===

  private onCourseSelected(courseUuid: string): void {
    const course = this.availableCourses.find(c => c.uuid === courseUuid);
    if (!course) return;

    // Filtrar docentes elegibles
    this.classAssignmentService.getEligibleTeachers(course)
      .pipe(takeUntil(this.destroy$))
      .subscribe(teachers => {
        this.eligibleTeachers = teachers;

        // Auto-seleccionar si solo hay uno
        if (teachers.length === 1) {
          this.quickAssignForm.patchValue({ teacher: teachers[0].uuid });
        }
      });

    // Filtrar espacios elegibles
    this.classAssignmentService.getEligibleLearningSpaces(course)
      .pipe(takeUntil(this.destroy$))
      .subscribe(spaces => {
        this.eligibleSpaces = spaces;

        // Auto-seleccionar si solo hay uno del tipo requerido
        if (spaces.length === 1) {
          this.quickAssignForm.patchValue({ space: spaces[0].uuid });
        }
      });

    // Sugerir tipo de sesión
    const courseType = this.getCourseType(course);
    if (courseType === 'THEORY') {
      this.quickAssignForm.patchValue({ sessionType: 'THEORY' });
    } else if (courseType === 'PRACTICE') {
      this.quickAssignForm.patchValue({ sessionType: 'PRACTICE' });
    }
  }

  private onGroupSelected(groupUuid: string): void {
    const group = this.studentGroups.find(g => g.uuid === groupUuid);
    if (!group) return;

    // Filtrar cursos del mismo ciclo
    const compatibleCourses = this.availableCourses.filter(course =>
      course.cycle.uuid === group.cycleUuid
    );

    this.availableCourses = compatibleCourses;
  }

  private updateAvailableHours(): void {
    const formValue = this.quickAssignForm.value;

    if (formValue.teacher && formValue.space && formValue.group && formValue.dayOfWeek) {
      this.classAssignmentService.getAvailableTeachingHours(
        formValue.teacher,
        formValue.space,
        formValue.group,
        formValue.dayOfWeek
      ).pipe(takeUntil(this.destroy$))
        .subscribe(hours => {
          this.highlightAvailableHours(hours);
        });
    }
  }

  private highlightAvailableHours(availableHours: TeachingHour[]): void {
    this.scheduleMatrix.forEach(row => {
      row.forEach(cell => {
        const isAvailable = availableHours.some(hour => hour.uuid === cell.teachingHour.uuid);
        cell.isAvailable = isAvailable && !cell.session;

        // Generar sugerencias para celdas disponibles
        if (isAvailable && !cell.session) {
          cell.suggestions = this.generateCellSuggestions(cell);
        }
      });
    });
  }

  private generateCellSuggestions(cell: ScheduleCell): string[] {
    const suggestions: string[] = [];
    const formValue = this.quickAssignForm.value;

    if (formValue.course && formValue.teacher) {
      suggestions.push(`Disponible para ${this.getCourseDisplayName(formValue.course)}`);
      suggestions.push(`Docente libre: ${this.getTeacherDisplayName(formValue.teacher)}`);
    }

    // Agregar sugerencias basadas en patrones de horario
    if (cell.timeSlot.name.includes('MAÑANA')) {
      suggestions.push('Horario matutino - Ideal para cursos teóricos');
    }

    return suggestions;
  }

  private validateCurrentSelection(): void {
    const formValue = this.quickAssignForm.value;
    const selectedHours = this.getSelectedTeachingHours();

    if (selectedHours.length === 0) return;

    this.classAssignmentService.validateAssignmentInRealTime(
      formValue.course,
      formValue.teacher,
      formValue.space,
      formValue.group,
      formValue.dayOfWeek,
      selectedHours.map(h => h.uuid)
    ).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.showValidationFeedback(result);
      });
  }

  private showValidationFeedback(result: ValidationResult): void {
    // Mostrar errores inmediatamente
    if (result.errors.length > 0) {
      this.snackBar.open(
        `⚠️ ${result.errors[0]}`,
        'Cerrar',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
    }

    // Mostrar advertencias
    if (result.warnings.length > 0) {
      this.snackBar.open(
        `⚡ ${result.warnings[0]}`,
        'Entendido',
        {
          duration: 3000,
          panelClass: ['warning-snackbar']
        }
      );
    }

    // Mostrar sugerencias
    if (result.suggestions && result.suggestions.length > 0) {
      this.snackBar.open(
        `💡 ${result.suggestions[0]}`,
        'Ver más',
        {
          duration: 4000,
          panelClass: ['suggestion-snackbar']
        }
      );
    }
  }

  // === DRAG & DROP ===

  onSessionDragStart(session: ClassSession): void {
    this.draggedSession = session;
  }

  onCellDrop(event: CdkDragDrop<ScheduleCell[]>, targetCell: ScheduleCell): void {
    if (!this.draggedSession || targetCell.session) return;

    // Validar si se puede mover a esta celda
    this.validateSessionMove(this.draggedSession, targetCell)
      .then(isValid => {
        if (isValid) {
          this.moveSession(this.draggedSession!, targetCell);
        } else {
          this.snackBar.open('No se puede mover la sesión a esta ubicación', 'Cerrar', { duration: 3000 });
        }
        this.draggedSession = null;
      });
  }

  private async validateSessionMove(session: ClassSession, targetCell: ScheduleCell): Promise<boolean> {
    // Implementar validación de movimiento
    return new Promise(resolve => {
      this.classAssignmentService.validateAssignmentInRealTime(
        session.course.uuid,
        session.teacher.uuid,
        session.learningSpace.uuid,
        session.studentGroup.uuid,
        targetCell.dayOfWeek,
        [targetCell.teachingHour.uuid]
      ).pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          resolve(result.isValid);
        });
    });
  }

  private moveSession(session: ClassSession, targetCell: ScheduleCell): void {
    // Actualizar la sesión con nuevos datos
    const updateData = {
      studentGroupUuid: session.studentGroup.uuid,
      courseUuid: session.course.uuid,
      teacherUuid: session.teacher.uuid,
      learningSpaceUuid: session.learningSpace.uuid,
      dayOfWeek: targetCell.dayOfWeek,
      sessionTypeUuid: session.sessionType.uuid,
      teachingHourUuids: [targetCell.teachingHour.uuid],
      notes: session.notes
    };

    this.classAssignmentService.updateClassSession(session.uuid, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Sesión movida exitosamente', 'Cerrar', { duration: 2000 });
          this.loadInitialData(); // Recargar datos
        },
        error: (error) => {
          console.error('Error al mover sesión:', error);
          this.snackBar.open('Error al mover la sesión', 'Cerrar', { duration: 3000 });
        }
      });
  }

  // === CELL INTERACTIONS ===

  onCellClick(cell: ScheduleCell): void {
    if (cell.session) {
      this.editSession(cell.session);
    } else if (cell.isAvailable) {
      this.createSessionInCell(cell);
    }
  }

  onCellHover(cell: ScheduleCell): void {
    this.hoveredCell = cell;

    if (this.isIntelliSenseEnabled && cell.isAvailable) {
      this.showCellTooltip(cell);
    }
  }

  onCellLeave(): void {
    this.hoveredCell = null;
  }

  private showCellTooltip(cell: ScheduleCell): void {
    // Implementar tooltip inteligente
    // Se puede usar Angular CDK Overlay para crear tooltips dinámicos
  }

  private createSessionInCell(cell: ScheduleCell): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        isNew: true,
        prefilledData: {
          dayOfWeek: cell.dayOfWeek,
          timeSlot: cell.timeSlot,
          teachingHour: cell.teachingHour,
          ...this.quickAssignForm.value
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createSession(result);
      }
    });
  }

  private editSession(session: ClassSession): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        isNew: false,
        session
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateSession(session.uuid, result);
      }
    });
  }

  // === CRUD OPERATIONS ===

  private createSession(sessionData: any): void {
    this.classAssignmentService.createClassSession(sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Sesión creada exitosamente', 'Cerrar', { duration: 2000 });
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error al crear sesión:', error);
          this.snackBar.open(
            error.error?.error || 'Error al crear la sesión',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  private updateSession(uuid: string, sessionData: any): void {
    this.classAssignmentService.updateClassSession(uuid, sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Sesión actualizada exitosamente', 'Cerrar', { duration: 2000 });
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error al actualizar sesión:', error);
          this.snackBar.open(
            error.error?.error || 'Error al actualizar la sesión',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  deleteSession(session: ClassSession): void {
    if (confirm(`¿Está seguro de eliminar la sesión de ${session.course.name}?`)) {
      this.classAssignmentService.deleteClassSession(session.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Sesión eliminada exitosamente', 'Cerrar', { duration: 2000 });
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error al eliminar sesión:', error);
            this.snackBar.open('Error al eliminar la sesión', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  // === UTILITY METHODS ===

  private getCourseType(course: Course): 'THEORY' | 'PRACTICE' | 'MIXED' {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'THEORY';
  }

  private getSelectedTeachingHours(): TeachingHour[] {
    return this.selectedCells.map(cell => cell.teachingHour);
  }

  private getCourseDisplayName(courseUuid: string): string {
    const course = this.availableCourses.find(c => c.uuid === courseUuid);
    return course ? `${course.code} - ${course.name}` : '';
  }

  private getTeacherDisplayName(teacherUuid: string): string {
    const teacher = this.eligibleTeachers.find(t => t.uuid === teacherUuid);
    return teacher ? teacher.fullName : '';
  }

  // === VIEW MANAGEMENT ===

  switchView(mode: 'TEACHER' | 'GROUP' | 'SPACE' | 'GLOBAL'): void {
    this.scheduleView.mode = mode;
    this.viewForm.patchValue({ mode });
    this.buildScheduleMatrix();
  }

  toggleWeekView(): void {
    this.scheduleView.weekView = !this.scheduleView.weekView;
  }

  toggleConflictDisplay(): void {
    this.scheduleView.showConflicts = !this.scheduleView.showConflicts;
  }

  toggleSuggestions(): void {
    this.scheduleView.showSuggestions = !this.scheduleView.showSuggestions;
  }

  toggleIntelliSense(): void {
    this.isIntelliSenseEnabled = !this.isIntelliSenseEnabled;
  }

  // === QUICK ACTIONS ===

  quickAssign(): void {
    const formValue = this.quickAssignForm.value;

    if (!this.quickAssignForm.valid) {
      this.snackBar.open('Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedHours = this.getSelectedTeachingHours();
    if (selectedHours.length === 0) {
      this.snackBar.open('Seleccione al menos una hora pedagógica', 'Cerrar', { duration: 3000 });
      return;
    }

    const sessionData = {
      studentGroupUuid: formValue.group,
      courseUuid: formValue.course,
      teacherUuid: formValue.teacher,
      learningSpaceUuid: formValue.space,
      dayOfWeek: formValue.dayOfWeek,
      sessionTypeUuid: formValue.sessionType,
      teachingHourUuids: selectedHours.map(h => h.uuid),
      notes: formValue.notes
    };

    this.createSession(sessionData);
  }

  clearQuickAssign(): void {
    this.quickAssignForm.reset();
    this.selectedCells = [];
    this.eligibleTeachers = [];
    this.eligibleSpaces = [];
  }

  // === EXPORT/IMPORT ===

  exportSchedule(): void {
    // Implementar exportación del horario
    this.snackBar.open('Función de exportación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  printSchedule(): void {
    window.print();
  }

  // === HELPERS FOR TEMPLATE ===

  getSessionDisplayText(session: ClassSession): string {
    return `${session.course.code}\n${session.teacher.fullName}`;
  }

  getSessionTooltipText(session: ClassSession): string {
    return `${session.course.name}\nDocente: ${session.teacher.fullName}\nAula: ${session.learningSpace.name}\nGrupo: ${session.studentGroup.name}`;
  }

  getCellClasses(cell: ScheduleCell): string[] {
    const classes = ['schedule-cell'];

    if (cell.session) classes.push('occupied');
    if (cell.isAvailable) classes.push('available');
    if (cell.hasConflict) classes.push('conflict');
    if (this.selectedCells.includes(cell)) classes.push('selected');
    if (cell === this.hoveredCell) classes.push('hovered');

    return classes;
  }

  getSessionClasses(session: ClassSession): string[] {
    const classes = ['session-card'];

    const courseType = this.getCourseType(session.course);
    classes.push(`type-${courseType.toLowerCase()}`);

    if (this.hasScheduleConflict({ session } as ScheduleCell)) {
      classes.push('has-conflict');
    }

    return classes;
  }
}
