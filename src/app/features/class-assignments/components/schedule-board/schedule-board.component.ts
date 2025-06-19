// src/app/features/class-assignments/components/schedule-board/schedule-board.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, debounceTime, distinctUntilChanged, startWith, switchMap, of } from 'rxjs';

// Angular Material Imports
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatExpansionModule } from '@angular/material/expansion';

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
  TeachingType
} from '../../services/class-assignment.service';

// Components
import { ClassSessionDialogComponent } from '../class-session-dialog/class-session-dialog.component';
import {ConflictIndicatorComponent} from '../conflict-indicator/conflict-indicator.component';
import {MatList, MatListItem} from '@angular/material/list';

interface ScheduleCell {
  timeSlot: TimeSlot;
  teachingHour: TeachingHour;
  dayOfWeek: string;
  session?: ClassSession;
  isAvailable: boolean;
  hasConflict: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  conflicts: string[];
  suggestions: string[];
  occupancyRate?: number;
}

interface ScheduleView {
  mode: 'GLOBAL' | 'TEACHER' | 'GROUP' | 'SPACE';
  selectedEntity?: Teacher | StudentGroup | LearningSpace;
  showConflicts: boolean;
  showSuggestions: boolean;
  showOccupancy: boolean;
}

interface ConflictInfo {
  type: 'TEACHER' | 'SPACE' | 'GROUP';
  message: string;
  severity: 'ERROR' | 'WARNING';
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
    MatAutocompleteModule,
    MatExpansionModule,
    DragDropModule,
    OverlayModule,
    ConflictIndicatorComponent,
    MatList,
    MatListItem
  ],
  templateUrl: './schedule-board.component.html',
  styleUrls: ['./schedule-board.component.scss']
})
export class ScheduleBoardComponent implements OnInit, OnDestroy {
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
  teachingTypes: TeachingType[] = [];

  // View State
  scheduleView: ScheduleView = {
    mode: 'GLOBAL',
    showConflicts: true,
    showSuggestions: true,
    showOccupancy: true
  };

  // UI State
  loading = false;
  isIntelliSenseEnabled = true;
  hoveredCell: ScheduleCell | null = null;
  selectedCells: ScheduleCell[] = [];
  draggedSession: ClassSession | null = null;

  // Real-time validation
  currentValidation: ValidationResult | null = null;
  conflictDetails: Map<string, ConflictInfo[]> = new Map();

  // Constants
  readonly daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  readonly dayLabels: { [key: string]: string } = {
    'MONDAY': 'Lunes',
    'TUESDAY': 'Martes',
    'WEDNESDAY': 'Miércoles',
    'THURSDAY': 'Jueves',
    'FRIDAY': 'Viernes'
  };

  // IntelliSense suggestions
  smartSuggestions: {
    teachers: Teacher[];
    spaces: LearningSpace[];
    courses: Course[];
    timeSlots: string[];
  } = {
    teachers: [],
    spaces: [],
    courses: [],
    timeSlots: []
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
      showConflicts: [true],
      showSuggestions: [true],
      showOccupancy: [true]
    });

    this.quickAssignForm = this.fb.group({
      group: ['', Validators.required],
      course: ['', Validators.required],
      teacher: ['', Validators.required],
      space: ['', Validators.required],
      dayOfWeek: ['', Validators.required],
      sessionType: ['', Validators.required],
      notes: ['']
    });
  }

  private loadInitialData(): void {
    this.loading = true;

    combineLatest([
      this.classAssignmentService.getAllTimeSlots(),
      this.classAssignmentService.getAllClassSessions(),
      this.classAssignmentService.getAllStudentGroups(),
      this.classAssignmentService.getAllCourses(),
      this.classAssignmentService.getAllTeachingTypes()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([timeSlotsRes, sessionsRes, groupsRes, coursesRes, typesRes]) => {
          this.timeSlots = Array.isArray(timeSlotsRes.data) ? timeSlotsRes.data : [timeSlotsRes.data];
          this.classSessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [sessionsRes.data];
          this.studentGroups = Array.isArray(groupsRes.data) ? groupsRes.data : [groupsRes.data];
          this.availableCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [coursesRes.data];
          this.teachingTypes = Array.isArray(typesRes.data) ? typesRes.data : [typesRes.data];

          this.buildScheduleMatrix();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          this.snackBar.open('Error al cargar los datos del horario', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
  }

  private setupIntelliSense(): void {
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

    // Escuchar cambios en el curso para filtrar docentes y aulas
    this.quickAssignForm.get('course')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(courseUuid => {
          if (!courseUuid) return of({ teachers: [], spaces: [] });

          return combineLatest([
            this.classAssignmentService.getEligibleTeachers(this.getSelectedCourse()!),
            this.classAssignmentService.getEligibleLearningSpaces(this.getSelectedCourse()!)
          ]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(([teachers, spaces]) => {
        this.eligibleTeachers = teachers;
        this.eligibleSpaces = spaces;

        // Auto-seleccionar si solo hay una opción
        if (teachers.length === 1) {
          this.quickAssignForm.patchValue({ teacher: teachers[0].uuid });
        }
        if (spaces.length === 1) {
          this.quickAssignForm.patchValue({ space: spaces[0].uuid });
        }

        // Actualizar sugerencias inteligentes
        this.updateSmartSuggestions();
      });

    // Escuchar cambios en el día y actualizar disponibilidad
    combineLatest([
      this.quickAssignForm.get('dayOfWeek')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('teacher')!.valueChanges.pipe(startWith('')),
      this.quickAssignForm.get('space')!.valueChanges.pipe(startWith(''))
    ]).pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(([day, teacher, space]) => {
      if (day && teacher && space) {
        this.updateCellAvailability();
      }
    });
  }

  private setupRealTimeValidation(): void {
    // Validación en tiempo real cuando se seleccionan horas
    combineLatest([
      this.quickAssignForm.valueChanges.pipe(startWith(this.quickAssignForm.value)),
      new Subject<ScheduleCell[]>().pipe(startWith(this.selectedCells))
    ]).pipe(
      debounceTime(500),
      switchMap(([formValue, selectedCells]) => {
        if (!this.isFormValid() || selectedCells.length === 0) {
          return of(null);
        }

        const teachingHourUuids = selectedCells.map(cell => cell.teachingHour.uuid);

        return this.classAssignmentService.validateAssignmentInRealTime(
          formValue.course,
          formValue.teacher,
          formValue.space,
          formValue.group,
          formValue.dayOfWeek,
          teachingHourUuids
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(validation => {
      this.currentValidation = validation;
      if (validation) {
        this.showValidationFeedback(validation);
      }
    });
  }

  private buildScheduleMatrix(): void {
    this.scheduleMatrix = [];

    // Ordenar timeSlots por hora de inicio
    const sortedTimeSlots = [...this.timeSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    sortedTimeSlots.forEach(timeSlot => {
      // Ordenar horas pedagógicas dentro del turno
      const sortedHours = [...timeSlot.teachingHours].sort((a, b) =>
        a.orderInTimeSlot - b.orderInTimeSlot
      );

      sortedHours.forEach(teachingHour => {
        const row: ScheduleCell[] = [];

        this.daysOfWeek.forEach(day => {
          // Buscar sesión existente
          const session = this.classSessions.find(s =>
            s.dayOfWeek === day &&
            s.teachingHours.some(h => h.uuid === teachingHour.uuid)
          );

          // Crear celda
          const cell: ScheduleCell = {
            timeSlot,
            teachingHour,
            dayOfWeek: day,
            session,
            isAvailable: !session,
            hasConflict: false,
            isHighlighted: false,
            isSelected: false,
            conflicts: [],
            suggestions: []
          };

          // Verificar conflictos si hay sesión
          if (session) {
            cell.hasConflict = this.checkSessionConflicts(session);
            cell.conflicts = this.getConflictMessages(session);
          }

          row.push(cell);
        });

        this.scheduleMatrix.push(row);
      });
    });

    // Actualizar estadísticas de ocupación
    this.updateOccupancyStats();
  }

  private checkSessionConflicts(session: ClassSession): boolean {
    // Verificar si hay otras sesiones con el mismo docente, aula o grupo
    const conflicts = this.classSessions.filter(s =>
      s.uuid !== session.uuid &&
      s.dayOfWeek === session.dayOfWeek &&
      s.teachingHours.some(h1 =>
        session.teachingHours.some(h2 => h1.uuid === h2.uuid)
      ) &&
      (s.teacher.uuid === session.teacher.uuid ||
        s.learningSpace.uuid === session.learningSpace.uuid ||
        s.studentGroup.uuid === session.studentGroup.uuid)
    );

    return conflicts.length > 0;
  }

  private getConflictMessages(session: ClassSession): string[] {
    const messages: string[] = [];

    const conflictingSessions = this.classSessions.filter(s =>
      s.uuid !== session.uuid &&
      s.dayOfWeek === session.dayOfWeek &&
      s.teachingHours.some(h1 =>
        session.teachingHours.some(h2 => h1.uuid === h2.uuid)
      )
    );

    conflictingSessions.forEach(conflict => {
      if (conflict.teacher.uuid === session.teacher.uuid) {
        messages.push(`Conflicto de docente: ${conflict.teacher.fullName} ya tiene asignado ${conflict.course.name}`);
      }
      if (conflict.learningSpace.uuid === session.learningSpace.uuid) {
        messages.push(`Conflicto de aula: ${conflict.learningSpace.name} está ocupada por ${conflict.course.name}`);
      }
      if (conflict.studentGroup.uuid === session.studentGroup.uuid) {
        messages.push(`Conflicto de grupo: ${conflict.studentGroup.name} ya tiene ${conflict.course.name}`);
      }
    });

    return messages;
  }

  private updateOccupancyStats(): void {
    this.scheduleMatrix.forEach(row => {
      row.forEach(cell => {
        if (this.scheduleView.showOccupancy) {
          // Calcular tasa de ocupación para cada celda
          const totalSessionsInSlot = this.classSessions.filter(s =>
            s.dayOfWeek === cell.dayOfWeek &&
            s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
          ).length;

          const totalSpaces = this.eligibleSpaces.length || 1;
          cell.occupancyRate = (totalSessionsInSlot / totalSpaces) * 100;
        }
      });
    });
  }

  // === EVENT HANDLERS ===

  onCellClick(cell: ScheduleCell): void {
    if (cell.session) {
      // Si hay sesión, abrir diálogo de edición
      this.editSession(cell.session);
    } else if (this.quickAssignForm.valid && this.isIntelliSenseEnabled) {
      // Toggle selección de celda para asignación rápida
      const index = this.selectedCells.findIndex(c =>
        c.teachingHour.uuid === cell.teachingHour.uuid &&
        c.dayOfWeek === cell.dayOfWeek
      );

      if (index >= 0) {
        this.selectedCells.splice(index, 1);
        cell.isSelected = false;
      } else {
        // Verificar si las celdas son contiguas
        if (this.canAddCell(cell)) {
          this.selectedCells.push(cell);
          cell.isSelected = true;
        } else {
          this.snackBar.open('Las horas deben ser contiguas', 'Cerrar', {
            duration: 2000,
            panelClass: ['warning-snackbar']
          });
        }
      }

      // Actualizar validación
      this.validateCurrentSelection();
    }
  }

  private canAddCell(cell: ScheduleCell): boolean {
    if (this.selectedCells.length === 0) return true;

    // Verificar que sea el mismo día
    const sameDay = this.selectedCells.every(c => c.dayOfWeek === cell.dayOfWeek);
    if (!sameDay) return false;

    // Verificar que sea del mismo turno
    const sameTimeSlot = this.selectedCells.every(c => c.timeSlot.uuid === cell.timeSlot.uuid);
    if (!sameTimeSlot) return false;

    // Verificar que sea contiguo
    const orders = this.selectedCells.map(c => c.teachingHour.orderInTimeSlot);
    orders.push(cell.teachingHour.orderInTimeSlot);
    orders.sort((a, b) => a - b);

    for (let i = 1; i < orders.length; i++) {
      if (orders[i] - orders[i-1] !== 1) return false;
    }

    return true;
  }

  onCellHover(cell: ScheduleCell): void {
    this.hoveredCell = cell;

    if (this.isIntelliSenseEnabled && !cell.session) {
      // Generar sugerencias para la celda
      cell.suggestions = this.generateCellSuggestions(cell);
    }
  }

  onCellLeave(): void {
    this.hoveredCell = null;
  }

  onCellDrop(event: CdkDragDrop<ScheduleCell[]>, targetCell: ScheduleCell): void {
    if (!this.draggedSession || targetCell.session) return;

    // Validar que se puede mover la sesión
    const canMove = this.validateSessionMove(this.draggedSession, targetCell);

    if (canMove) {
      this.moveSession(this.draggedSession, targetCell);
    } else {
      this.snackBar.open('No se puede mover la sesión a este horario', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  // === SMART ASSIGNMENT METHODS ===

  private onGroupSelected(groupUuid: string): void {
    const group = this.studentGroups.find(g => g.uuid === groupUuid);
    if (!group) return;

    // Filtrar cursos del mismo ciclo
    this.availableCourses = this.availableCourses.filter(course =>
      course.cycle.uuid === group.cycleUuid
    );

    // Limpiar selección de curso si no es compatible
    const currentCourse = this.quickAssignForm.get('course')?.value;
    if (currentCourse && !this.availableCourses.find(c => c.uuid === currentCourse)) {
      this.quickAssignForm.patchValue({ course: '' });
    }

    // Actualizar vista si está en modo grupo
    if (this.scheduleView.mode === 'GROUP') {
      this.scheduleView.selectedEntity = group;
      this.buildScheduleMatrix();
    }
  }

  private updateSmartSuggestions(): void {
    const course = this.getSelectedCourse();
    if (!course) return;

    // Determinar tipo de sesión recomendado
    const sessionType = this.determineSessionType(course);
    if (sessionType) {
      this.quickAssignForm.patchValue({ sessionType: sessionType.uuid });
    }

    // Actualizar sugerencias basadas en patrones de horario
    this.smartSuggestions = {
      teachers: this.eligibleTeachers.filter(t =>
        t.knowledgeAreas.some(ka => ka.uuid === course.teachingKnowledgeArea.uuid)
      ),
      spaces: this.eligibleSpaces.filter(s =>
        this.isSpaceCompatible(s, course)
      ),
      courses: this.availableCourses,
      timeSlots: this.suggestBestTimeSlots(course)
    };
  }

  private determineSessionType(course: Course): TeachingType | null {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && !hasPractice) {
      return this.teachingTypes.find(t => t.name === 'THEORY') || null;
    } else if (!hasTheory && hasPractice) {
      return this.teachingTypes.find(t => t.name === 'PRACTICE') || null;
    }

    // Para cursos mixtos, sugerir basado en lo que falta asignar
    return this.suggestMixedSessionType(course);
  }

  private suggestMixedSessionType(course: Course): TeachingType | null {
    // Contar horas ya asignadas
    const assignedSessions = this.classSessions.filter(s =>
      s.course.uuid === course.uuid
    );

    let theoryAssigned = 0;
    let practiceAssigned = 0;

    assignedSessions.forEach(session => {
      const hours = session.teachingHours.length;
      if (session.sessionType.name === 'THEORY') {
        theoryAssigned += hours;
      } else {
        practiceAssigned += hours;
      }
    });

    // Sugerir el tipo que falte más
    const theoryNeeded = course.weeklyTheoryHours - theoryAssigned;
    const practiceNeeded = course.weeklyPracticeHours - practiceAssigned;

    if (theoryNeeded > practiceNeeded) {
      return this.teachingTypes.find(t => t.name === 'THEORY') || null;
    } else {
      return this.teachingTypes.find(t => t.name === 'PRACTICE') || null;
    }
  }

  private isSpaceCompatible(space: LearningSpace, course: Course): boolean {
    const courseType = this.getCourseType(course);

    if (courseType === 'THEORY') {
      return space.teachingType.name === 'THEORY';
    } else if (courseType === 'PRACTICE') {
      return space.teachingType.name === 'PRACTICE' &&
        (!course.preferredSpecialty || space.specialty?.uuid === course.preferredSpecialty.uuid);
    }

    // Para cursos mixtos, depende del tipo de sesión seleccionado
    const selectedType = this.quickAssignForm.get('sessionType')?.value;
    if (selectedType) {
      const type = this.teachingTypes.find(t => t.uuid === selectedType);
      return type?.name === 'THEORY' ?
        space.teachingType.name === 'THEORY' :
        space.teachingType.name === 'PRACTICE';
    }

    return true;
  }

  private suggestBestTimeSlots(course: Course): string[] {
    const suggestions: string[] = [];

    // Analizar patrones de horario existentes
    const courseType = this.getCourseType(course);

    if (courseType === 'THEORY') {
      suggestions.push('Preferible en horario matutino');
      suggestions.push('Evitar últimas horas del día');
    } else if (courseType === 'PRACTICE') {
      suggestions.push('Ideal en bloques de 2-4 horas');
      suggestions.push('Considerar disponibilidad de laboratorios');
    }

    // Sugerir basado en carga del docente
    const selectedTeacher = this.getSelectedTeacher();
    if (selectedTeacher) {
      const teacherLoad = this.calculateTeacherLoad(selectedTeacher.uuid);
      if (teacherLoad.morningHours > teacherLoad.afternoonHours) {
        suggestions.push('Docente tiene más carga en la mañana, considerar tarde');
      }
    }

    return suggestions;
  }

  private calculateTeacherLoad(teacherUuid: string): { morningHours: number; afternoonHours: number } {
    let morningHours = 0;
    let afternoonHours = 0;

    this.classSessions
      .filter(s => s.teacher.uuid === teacherUuid)
      .forEach(session => {
        const hour = parseInt(session.teachingHours[0].startTime.split(':')[0]);
        if (hour < 13) {
          morningHours += session.teachingHours.length;
        } else {
          afternoonHours += session.teachingHours.length;
        }
      });

    return { morningHours, afternoonHours };
  }

  private generateCellSuggestions(cell: ScheduleCell): string[] {
    const suggestions: string[] = [];

    // Verificar ocupación del día
    const dayOccupancy = this.calculateDayOccupancy(cell.dayOfWeek);
    if (dayOccupancy < 30) {
      suggestions.push('Día con baja ocupación - Ideal para nuevas asignaciones');
    } else if (dayOccupancy > 70) {
      suggestions.push('Día con alta ocupación - Considerar otro día');
    }

    // Verificar disponibilidad de recursos
    const availableTeachers = this.getAvailableTeachersForCell(cell);
    const availableSpaces = this.getAvailableSpacesForCell(cell);

    suggestions.push(`${availableTeachers.length} docentes disponibles`);
    suggestions.push(`${availableSpaces.length} aulas disponibles`);

    // Sugerencias basadas en el turno
    if (cell.timeSlot.name.includes('MAÑANA')) {
      suggestions.push('Horario preferido para cursos teóricos');
    } else if (cell.timeSlot.name.includes('TARDE')) {
      suggestions.push('Ideal para laboratorios y prácticas');
    }

    return suggestions;
  }

  private updateCellAvailability(): void {
    const day = this.quickAssignForm.get('dayOfWeek')?.value;
    const teacher = this.quickAssignForm.get('teacher')?.value;
    const space = this.quickAssignForm.get('space')?.value;

    if (!day || !teacher || !space) return;

    this.scheduleMatrix.forEach(row => {
      row.forEach(cell => {
        if (cell.dayOfWeek === day && !cell.session) {
          // Verificar disponibilidad real
          cell.isAvailable = this.checkCellAvailability(cell, teacher, space);

          if (cell.isAvailable) {
            cell.isHighlighted = true;
          } else {
            cell.isHighlighted = false;
            cell.conflicts = this.getCellConflicts(cell, teacher, space);
          }
        }
      });
    });
  }

  private checkCellAvailability(cell: ScheduleCell, teacherUuid: string, spaceUuid: string): boolean {
    // Verificar si el docente está disponible
    const teacherAvailable = !this.classSessions.some(s =>
      s.teacher.uuid === teacherUuid &&
      s.dayOfWeek === cell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
    );

    // Verificar si el aula está disponible
    const spaceAvailable = !this.classSessions.some(s =>
      s.learningSpace.uuid === spaceUuid &&
      s.dayOfWeek === cell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
    );

    return teacherAvailable && spaceAvailable;
  }

  private getCellConflicts(cell: ScheduleCell, teacherUuid: string, spaceUuid: string): string[] {
    const conflicts: string[] = [];

    // Verificar conflictos de docente
    const teacherConflict = this.classSessions.find(s =>
      s.teacher.uuid === teacherUuid &&
      s.dayOfWeek === cell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
    );

    if (teacherConflict) {
      conflicts.push(`Docente ocupado con ${teacherConflict.course.name}`);
    }

    // Verificar conflictos de aula
    const spaceConflict = this.classSessions.find(s =>
      s.learningSpace.uuid === spaceUuid &&
      s.dayOfWeek === cell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
    );

    if (spaceConflict) {
      conflicts.push(`Aula ocupada por ${spaceConflict.course.name}`);
    }

    return conflicts;
  }

  private validateCurrentSelection(): void {
    if (!this.isFormValid() || this.selectedCells.length === 0) return;

    const formValue = this.quickAssignForm.value;
    const teachingHourUuids = this.selectedCells.map(c => c.teachingHour.uuid);

    this.classAssignmentService.validateAssignmentInRealTime(
      formValue.course,
      formValue.teacher,
      formValue.space,
      formValue.group,
      formValue.dayOfWeek,
      teachingHourUuids
    ).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.currentValidation = result;
        this.showValidationFeedback(result);
      });
  }

  private showValidationFeedback(result: ValidationResult): void {
    // Limpiar mensajes anteriores
    this.snackBar.dismiss();

    if (!result.isValid && result.errors.length > 0) {
      // Mostrar errores críticos
      this.snackBar.open(
        `⚠️ ${result.errors[0]}`,
        'Cerrar',
        {
          duration: 5000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        }
      );
    } else if (result.warnings.length > 0) {
      // Mostrar advertencias
      this.snackBar.open(
        `⚡ ${result.warnings[0]}`,
        'Entendido',
        {
          duration: 3000,
          panelClass: ['warning-snackbar'],
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        }
      );
    } else if (result.suggestions && result.suggestions.length > 0) {
      // Mostrar sugerencias
      this.snackBar.open(
        `💡 ${result.suggestions[0]}`,
        'OK',
        {
          duration: 3000,
          panelClass: ['info-snackbar'],
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        }
      );
    }
  }

  // === CRUD OPERATIONS ===

  quickAssign(): void {
    if (!this.isFormValid() || this.selectedCells.length === 0) {
      this.snackBar.open('Complete todos los campos y seleccione al menos una hora', 'Cerrar', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Verificar validación final
    if (this.currentValidation && !this.currentValidation.isValid) {
      this.snackBar.open('Corrija los errores antes de guardar', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const formValue = this.quickAssignForm.value;
    const sessionData = {
      studentGroupUuid: formValue.group,
      courseUuid: formValue.course,
      teacherUuid: formValue.teacher,
      learningSpaceUuid: formValue.space,
      dayOfWeek: formValue.dayOfWeek,
      sessionTypeUuid: formValue.sessionType,
      teachingHourUuids: this.selectedCells.map(c => c.teachingHour.uuid),
      notes: formValue.notes
    };

    this.createSession(sessionData);
  }

  private createSession(sessionData: any): void {
    this.loading = true;

    this.classAssignmentService.createClassSession(sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.snackBar.open('✅ Sesión creada exitosamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });

          // Limpiar formulario y selección
          this.clearQuickAssign();

          // Recargar datos
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error al crear sesión:', error);
          this.snackBar.open(
            error.error?.message || 'Error al crear la sesión',
            'Cerrar',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
          this.loading = false;
        }
      });
  }

  editSession(session: ClassSession): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        isNew: false,
        session: session
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateSession(session.uuid, result);
      }
    });
  }

  private updateSession(uuid: string, sessionData: any): void {
    this.loading = true;

    this.classAssignmentService.updateClassSession(uuid, sessionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('✅ Sesión actualizada exitosamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error al actualizar sesión:', error);
          this.snackBar.open(
            error.error?.message || 'Error al actualizar la sesión',
            'Cerrar',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
          this.loading = false;
        }
      });
  }

  deleteSession(session: ClassSession): void {
    if (confirm(`¿Está seguro de eliminar la sesión de ${session.course.name}?`)) {
      this.loading = true;

      this.classAssignmentService.deleteClassSession(session.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('✅ Sesión eliminada exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error al eliminar sesión:', error);
            this.snackBar.open(
              error.error?.message || 'Error al eliminar la sesión',
              'Cerrar',
              {
                duration: 5000,
                panelClass: ['error-snackbar']
              }
            );
            this.loading = false;
          }
        });
    }
  }

  duplicateSession(session: ClassSession): void {
    const dialogRef = this.dialog.open(ClassSessionDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        isNew: true,
        prefilledData: {
          course: session.course.uuid,
          teacher: session.teacher.uuid,
          space: session.learningSpace.uuid,
          sessionType: session.sessionType.uuid,
          group: session.studentGroup.uuid
        }
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createSession(result);
      }
    });
  }

  private moveSession(session: ClassSession, targetCell: ScheduleCell): void {
    const updatedData = {
      ...this.mapSessionToRequest(session),
      dayOfWeek: targetCell.dayOfWeek,
      teachingHourUuids: [targetCell.teachingHour.uuid]
    };

    this.updateSession(session.uuid, updatedData);
  }

  private validateSessionMove(session: ClassSession, targetCell: ScheduleCell): boolean {
    // Verificar que el docente esté disponible
    const teacherAvailable = !this.classSessions.some(s =>
      s.uuid !== session.uuid &&
      s.teacher.uuid === session.teacher.uuid &&
      s.dayOfWeek === targetCell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === targetCell.teachingHour.uuid)
    );

    // Verificar que el aula esté disponible
    const spaceAvailable = !this.classSessions.some(s =>
      s.uuid !== session.uuid &&
      s.learningSpace.uuid === session.learningSpace.uuid &&
      s.dayOfWeek === targetCell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === targetCell.teachingHour.uuid)
    );

    // Verificar que el grupo no tenga conflicto
    const groupAvailable = !this.classSessions.some(s =>
      s.uuid !== session.uuid &&
      s.studentGroup.uuid === session.studentGroup.uuid &&
      s.dayOfWeek === targetCell.dayOfWeek &&
      s.teachingHours.some(h => h.uuid === targetCell.teachingHour.uuid)
    );

    return teacherAvailable && spaceAvailable && groupAvailable;
  }

  // === VIEW MANAGEMENT ===

  switchView(mode: 'GLOBAL' | 'TEACHER' | 'GROUP' | 'SPACE'): void {
    this.scheduleView.mode = mode;
    this.viewForm.patchValue({ mode });

    // Resetear entidad seleccionada
    this.scheduleView.selectedEntity = undefined;

    // Reconstruir matriz según el modo
    this.buildScheduleMatrix();
  }

  toggleConflictDisplay(): void {
    this.scheduleView.showConflicts = !this.scheduleView.showConflicts;
    this.buildScheduleMatrix();
  }

  toggleSuggestions(): void {
    this.scheduleView.showSuggestions = !this.scheduleView.showSuggestions;
  }

  toggleIntelliSense(): void {
    this.isIntelliSenseEnabled = !this.isIntelliSenseEnabled;
    if (!this.isIntelliSenseEnabled) {
      this.clearSelection();
    }
  }

  toggleOccupancy(): void {
    this.scheduleView.showOccupancy = !this.scheduleView.showOccupancy;
    this.updateOccupancyStats();
  }

  // === UTILITY METHODS ===

  clearQuickAssign(): void {
    this.quickAssignForm.reset();
    this.clearSelection();
    this.eligibleTeachers = [];
    this.eligibleSpaces = [];
    this.currentValidation = null;
  }

  clearSelection(): void {
    this.selectedCells.forEach(cell => {
      cell.isSelected = false;
    });
    this.selectedCells = [];
  }

  private isFormValid(): boolean {
    return this.quickAssignForm.valid && this.quickAssignForm.value.course &&
      this.quickAssignForm.value.teacher && this.quickAssignForm.value.space;
  }

  private getCourseType(course: Course): 'THEORY' | 'PRACTICE' | 'MIXED' {
    const hasTheory = course.weeklyTheoryHours > 0;
    const hasPractice = course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'THEORY';
  }

  private getSelectedCourse(): Course | null {
    const courseUuid = this.quickAssignForm.get('course')?.value;
    return this.availableCourses.find(c => c.uuid === courseUuid) || null;
  }

  private getSelectedTeacher(): Teacher | null {
    const teacherUuid = this.quickAssignForm.get('teacher')?.value;
    return this.eligibleTeachers.find(t => t.uuid === teacherUuid) || null;
  }

  private calculateDayOccupancy(day: string): number {
    const totalSlots = this.scheduleMatrix.length * this.studentGroups.length;
    const occupiedSlots = this.classSessions.filter(s => s.dayOfWeek === day).length;
    return (occupiedSlots / totalSlots) * 100;
  }

  private getAvailableTeachersForCell(cell: ScheduleCell): Teacher[] {
    return this.eligibleTeachers.filter(teacher =>
      !this.classSessions.some(s =>
        s.teacher.uuid === teacher.uuid &&
        s.dayOfWeek === cell.dayOfWeek &&
        s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
      )
    );
  }

  private getAvailableSpacesForCell(cell: ScheduleCell): LearningSpace[] {
    return this.eligibleSpaces.filter(space =>
      !this.classSessions.some(s =>
        s.learningSpace.uuid === space.uuid &&
        s.dayOfWeek === cell.dayOfWeek &&
        s.teachingHours.some(h => h.uuid === cell.teachingHour.uuid)
      )
    );
  }

  private mapSessionToRequest(session: ClassSession): any {
    return {
      studentGroupUuid: session.studentGroup.uuid,
      courseUuid: session.course.uuid,
      teacherUuid: session.teacher.uuid,
      learningSpaceUuid: session.learningSpace.uuid,
      dayOfWeek: session.dayOfWeek,
      sessionTypeUuid: session.sessionType.uuid,
      teachingHourUuids: session.teachingHours.map(h => h.uuid),
      notes: session.notes
    };
  }

  // === EXPORT/IMPORT ===

  exportSchedule(): void {
    // TODO: Implementar exportación a Excel/PDF
    this.snackBar.open('Función de exportación en desarrollo', 'Cerrar', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  printSchedule(): void {
    window.print();
  }

  // === TEMPLATE HELPERS ===

  getCellClasses(cell: ScheduleCell): string[] {
    const classes = ['schedule-cell'];

    if (cell.session) {
      classes.push('occupied');

      // Tipo de sesión
      const sessionType = cell.session.sessionType.name;
      classes.push(`session-${sessionType.toLowerCase()}`);

      // Conflictos
      if (cell.hasConflict) {
        classes.push('has-conflict');
      }
    } else {
      if (cell.isAvailable) classes.push('available');
      if (cell.isHighlighted) classes.push('highlighted');
      if (cell.isSelected) classes.push('selected');

      // Ocupación
      if (this.scheduleView.showOccupancy && cell.occupancyRate !== undefined) {
        if (cell.occupancyRate > 80) classes.push('high-occupancy');
        else if (cell.occupancyRate > 50) classes.push('medium-occupancy');
        else classes.push('low-occupancy');
      }
    }

    return classes;
  }

  getSessionDisplayText(session: ClassSession): string {
    if (this.scheduleView.mode === 'TEACHER') {
      return `${session.course.code}\n${session.studentGroup.name}`;
    } else if (this.scheduleView.mode === 'GROUP') {
      return `${session.course.code}\n${session.teacher.fullName}`;
    } else if (this.scheduleView.mode === 'SPACE') {
      return `${session.course.code}\n${session.studentGroup.name}`;
    }
    return `${session.course.code}`;
  }

  getSessionTooltip(session: ClassSession): string {
    return `${session.course.name}
Docente: ${session.teacher.fullName}
Grupo: ${session.studentGroup.name}
Aula: ${session.learningSpace.name}
Tipo: ${session.sessionType.name === 'THEORY' ? 'Teórico' : 'Práctico'}
${session.notes ? `Notas: ${session.notes}` : ''}`;
  }

  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      return this.getSessionTooltip(cell.session);
    }

    const parts = [`${this.dayLabels[cell.dayOfWeek]} - ${cell.teachingHour.startTime} a ${cell.teachingHour.endTime}`];

    if (cell.conflicts.length > 0) {
      parts.push('Conflictos:');
      parts.push(...cell.conflicts);
    }

    if (cell.suggestions.length > 0 && this.scheduleView.showSuggestions) {
      parts.push('Sugerencias:');
      parts.push(...cell.suggestions);
    }

    return parts.join('\n');
  }

  getAvailableTeachersCount(cell: ScheduleCell): number {
    return this.getAvailableTeachersForCell(cell).length;
  }

  getAvailableSpacesCount(cell: ScheduleCell): number {
    return this.getAvailableSpacesForCell(cell).length;
  }

  hasScheduleConflict(cell: ScheduleCell): boolean {
    return cell.hasConflict;
  }

  getConflictCount(): number {
    return this.scheduleMatrix.flat().filter(cell => cell.hasConflict).length;
  }

  getOccupancyPercentage(): number {
    const totalCells = this.scheduleMatrix.flat().length;
    const occupiedCells = this.scheduleMatrix.flat().filter(cell => cell.session).length;
    return totalCells > 0 ? (occupiedCells / totalCells) * 100 : 0;
  }
}
