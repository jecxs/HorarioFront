// src/app/features/schedule-assignment/components/assignment-dialog/assignment-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, takeUntil, startWith, switchMap, of, map } from 'rxjs';
import { Router } from '@angular/router';
// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';

import { CourseMetadataService } from '../../services/course-metadata.service';

// Services
import { ClassSessionService } from '../../services/class-session.service';
import { CourseService } from '../../../courses/services/course.service';
import { TeachingTypeService } from '../../services/teaching-type.service';

// Models
import {
  ClassSessionRequest,
  StudentGroupResponse,
  CourseResponse,
  TeacherResponse,
  LearningSpaceResponse,
  TeachingHourResponse,
  DayOfWeek,
  ValidationResult,
  IntelliSenseResponse,
  ClassSessionValidation,
  TeachingTypeResponse,
  TeacherEligibilityResponse,
  TeacherClassConflict,
  GroupedTeachers,
  TeacherAvailabilityStatus, SelectedCellInfo
} from '../../models/class-session.model';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';

export interface AssignmentDialogData {
  mode: 'create' | 'edit';
  studentGroup?: StudentGroupResponse;
  dayOfWeek?: DayOfWeek;
  teachingHours?: TeachingHourResponse[];
  timeSlotUuid?: string;
  sessionToEdit?: any;
  // ✅ NUEVOS CAMPOS para selección múltiple
  selectedCells?: SelectedCellInfo[];
  isMultiSelection?: boolean;
  consolidatedHours?: TeachingHourResponse[];
}

interface SelectionState {
  course?: CourseResponse;
  teacher?: TeacherResponse;
  learningSpace?: LearningSpaceResponse;
  teachingType?: TeachingTypeResponse;
  selectedHours: TeachingHourResponse[];
  selectedSessionType?: 'THEORY' | 'PRACTICE';
}

interface SessionTypeOption {
  value: 'THEORY' | 'PRACTICE';
  label: string;
  description: string;
  icon: string;
  weeklyHours: number;
  assignedHours: number;
  isAvailable: boolean;
  recommendation?: string;
}

@Component({
  selector: 'app-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatBadgeModule,
    MatListModule,
    MatSnackBarModule,
    MatSelectSearchComponent,
    MatRadioModule
  ],
  templateUrl: './assignment-dialog.component.html',
  styleUrls: ['./assignment-dialog.component.scss']
})
export class AssignmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private classSessionService = inject(ClassSessionService);
  private courseService = inject(CourseService);
  private teachingTypeService = inject(TeachingTypeService);
  private courseMetadataService = inject(CourseMetadataService);
  private router = inject(Router);

  groupedTeachers: GroupedTeachers = {
    available: [],
    withConflicts: [],
    unavailable: [],
    noSchedule: []
  };
  showConflictDetails = false; // Para expandir/colapsar detalles de conflictos
  selectedConflictingTeacher: TeacherEligibilityResponse | null = null;
  // Form
  assignmentForm: FormGroup;
  courseFilterCtrl = new FormControl('');

  // State
  currentStep = 1;
  selectionState: SelectionState = {
    selectedHours: []
  };

  // Data
  courses: CourseResponse[] = [];
  filteredCourses$ = new BehaviorSubject<CourseResponse[]>([]);
  eligibleTeachers: TeacherResponse[] = [];
  eligibleTeachersDetailed: TeacherEligibilityResponse[] = [];
  eligibleSpaces: LearningSpaceResponse[] = [];
  groupedSpaces: { label: string; spaces: LearningSpaceResponse[] }[] = [];

  // ✅ Opciones de tipo de sesión
  sessionTypeOptions: SessionTypeOption[] = [];

  // IntelliSense
  intelliSense: IntelliSenseResponse | null = null;
  validationResult: ValidationResult | null = null;

  // Loading states
  loadingCourses = false;
  loadingTeachers = false;
  loadingSpaces = false;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<AssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignmentDialogData
  ) {
    this.assignmentForm = this.fb.group({
      courseUuid: ['', Validators.required],
      sessionType: ['', Validators.required],
      teacherUuid: ['', Validators.required],
      learningSpaceUuid: ['', Validators.required],
      sessionTypeUuid: ['', Validators.required],
      notes: ['']
    });

    // ✅ MANEJAR horas múltiples
    if (data.consolidatedHours && data.consolidatedHours.length > 0) {
      this.selectionState.selectedHours = data.consolidatedHours;
    } else if (data.teachingHours) {
      this.selectionState.selectedHours = data.teachingHours;
    }
  }

  ngOnInit(): void {
    this.loadCourses();
    this.setupCourseFilter();
    this.setupValidation();

    // Cargar tipos de enseñanza
    this.teachingTypeService.ensureTypesLoaded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Los tipos están cargados
      });

    // Si es modo edición, cargar los datos
    if (this.data.mode === 'edit' && this.data.sessionToEdit) {
      this.loadEditData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCourses(): void {
    this.loadingCourses = true;

    if (this.data.studentGroup) {
      this.courseService.getAllCourses()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const allCourses = Array.isArray(response.data) ? response.data : [response.data];

            // Filtrar por ciclo Y carrera
            this.courses = allCourses.filter((course: CourseResponse) => {
              const sameCycleNumber = course.cycle.number === this.data.studentGroup?.cycleNumber;
              const sameCareer = course.career.uuid === this.data.studentGroup?.careerUuid;
              return sameCycleNumber && sameCareer;
            });

            console.log(`Cursos filtrados: ${this.courses.length} cursos para ciclo ${this.data.studentGroup?.cycleNumber} de carrera ${this.data.studentGroup?.careerUuid}`);

            this.filteredCourses$.next(this.courses);
            this.loadingCourses = false;
          },
          error: (error) => {
            console.error('Error loading courses:', error);
            this.snackBar.open('Error al cargar cursos', 'Cerrar', { duration: 3000 });
            this.loadingCourses = false;
          }
        });
    }
  }

  private setupCourseFilter(): void {
    this.courseFilterCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        const term = (searchTerm ?? '').toLowerCase();
        const filtered = this.courses.filter(course =>
          course.name.toLowerCase().includes(term) ||
          course.code.toLowerCase().includes(term)
        );
        this.filteredCourses$.next(filtered);
      });
  }

  private setupValidation(): void {
    combineLatest([
      this.assignmentForm.get('courseUuid')!.valueChanges,
      this.assignmentForm.get('teacherUuid')!.valueChanges,
      this.assignmentForm.get('learningSpaceUuid')!.valueChanges,
      this.assignmentForm.get('sessionTypeUuid')!.valueChanges // ✅ AGREGAR ESTA LÍNEA
    ]).pipe(
      debounceTime(500),
      switchMap(([courseUuid, teacherUuid, spaceUuid, sessionTypeUuid]) => {
        // ✅ VERIFICAR QUE TODOS LOS CAMPOS ESTÉN PRESENTES
        if (courseUuid && teacherUuid && spaceUuid && sessionTypeUuid &&
          this.data.dayOfWeek && this.selectionState.selectedHours.length > 0) {

          const validation: ClassSessionValidation = {
            courseUuid,
            teacherUuid,
            learningSpaceUuid: spaceUuid,
            studentGroupUuid: this.data.studentGroup?.uuid || '',
            dayOfWeek: this.data.dayOfWeek.toString(),
            teachingHourUuids: this.selectionState.selectedHours.map(h => h.uuid),
            sessionTypeUuid, // ✅ INCLUIR EL sessionTypeUuid
            sessionUuid: this.data.mode === 'edit' ? this.data.sessionToEdit?.uuid : undefined
          };

          console.log('=== VALIDATION REQUEST ===');
          console.log('Validation payload:', validation);

          return this.classSessionService.validateAssignment(validation);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.validationResult = result;
      console.log('Validation result:', result);
    });
  }

  get canSave(): boolean {
    const formValid = this.assignmentForm.valid;
    const notSaving = !this.saving;
    const noValidationErrors = !this.validationResult ||
      (this.validationResult.isValid === true) ||
      (!this.validationResult.errors || this.validationResult.errors.length === 0);

    return formValid && notSaving && noValidationErrors;
  }

  onCourseSelected(courseUuid: string): void {
    const course = this.courses.find(c => c.uuid === courseUuid);
    if (course) {
      console.log('=== COURSE SELECTED ===');
      console.log('Course:', course);
      console.log('Weekly theory hours:', course.weeklyTheoryHours);
      console.log('Weekly practice hours:', course.weeklyPracticeHours);

      this.selectionState.course = course;

      // ✅ CAMBIO PRINCIPAL: Generar opciones de tipo de sesión
      this.generateSessionTypeOptions(course);

      this.currentStep = 2; // Ir al paso de selección de tipo de sesión
    }
  }

  // ✅ MÉTODO CLAVE: Generar opciones basadas en el curso Y las horas ya asignadas
  private generateSessionTypeOptions(course: CourseResponse): void {
    this.sessionTypeOptions = [];

    // ✅ Obtener horas ya asignadas desde el servicio de metadatos
    const assignedHours = this.courseMetadataService.getAssignedHoursByType(course.uuid);
    const assignedTheoryHours = assignedHours.theory;
    const assignedPracticeHours = assignedHours.practice;

    console.log('=== GENERATING SESSION TYPE OPTIONS (CORRECTED) ===');
    console.log('Course:', course.name);
    console.log('Course teaching types:', course.teachingTypes);
    console.log('Required - Theory:', course.weeklyTheoryHours, 'Practice:', course.weeklyPracticeHours);
    console.log('Assigned - Theory:', assignedTheoryHours, 'Practice:', assignedPracticeHours);

    // ✅ CORREGIR: Verificar que el curso SOPORTE el tipo de sesión
    const supportedTypes = course.teachingTypes.map(tt => tt.name);
    console.log('Supported teaching types:', supportedTypes);

    // Opción TEORÍA (solo si el curso tiene horas teóricas Y soporta THEORY)
    if (course.weeklyTheoryHours > 0 && supportedTypes.includes('THEORY')) {
      const remainingTheoryHours = course.weeklyTheoryHours - assignedTheoryHours;

      this.sessionTypeOptions.push({
        value: 'THEORY',
        label: 'Sesión Teórica',
        description: 'Clase teórica en aula tradicional',
        icon: 'menu_book',
        weeklyHours: course.weeklyTheoryHours,
        assignedHours: assignedTheoryHours,
        isAvailable: remainingTheoryHours > 0,
        recommendation: remainingTheoryHours > 0
          ? `Quedan ${remainingTheoryHours}h de teoría por asignar`
          : 'Ya se asignaron todas las horas teóricas'
      });
    }

    // Opción PRÁCTICA (solo si el curso tiene horas prácticas Y soporta PRACTICE)
    if (course.weeklyPracticeHours > 0 && supportedTypes.includes('PRACTICE')) {
      const remainingPracticeHours = course.weeklyPracticeHours - assignedPracticeHours;

      this.sessionTypeOptions.push({
        value: 'PRACTICE',
        label: 'Sesión Práctica',
        description: 'Clase práctica en laboratorio',
        icon: 'science',
        weeklyHours: course.weeklyPracticeHours,
        assignedHours: assignedPracticeHours,
        isAvailable: remainingPracticeHours > 0,
        recommendation: remainingPracticeHours > 0
          ? `Quedan ${remainingPracticeHours}h de práctica por asignar`
          : 'Ya se asignaron todas las horas prácticas'
      });
    }

    console.log('Generated session type options:', this.sessionTypeOptions);

    // ✅ LÓGICA MEJORADA: No auto-seleccionar, dejar que el usuario elija
    if (this.sessionTypeOptions.length === 1) {
      console.log('Only one option available, auto-selecting:', this.sessionTypeOptions[0].value);
      const selectedType = this.sessionTypeOptions[0].value;
      this.assignmentForm.patchValue({ sessionType: selectedType });
      this.onSessionTypeSelected(selectedType);
    } else if (this.sessionTypeOptions.length > 1) {
      console.log('Multiple options available, user must choose');
      // No auto-seleccionar, esperar input del usuario
    } else {
      console.log('❌ No session type options available for this course');
      this.snackBar.open(
        'Este curso no tiene tipos de sesión disponibles o ya están completas',
        'Cerrar',
        { duration: 5000 }
      );
    }
  }

  // ✅ MÉTODO: Cuando se selecciona un tipo de sesión
  onSessionTypeSelected(sessionType: 'THEORY' | 'PRACTICE'): void {
    console.log('=== SESSION TYPE SELECTED ===');
    console.log('Selected type:', sessionType);

    this.selectionState.selectedSessionType = sessionType;

    // ✅ CORREGIR: Determinar el UUID del tipo de enseñanza
    this.teachingTypeService.ensureTypesLoaded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const typeUuid = this.teachingTypeService.getTypeUuidByName(sessionType);
        console.log('Session type UUID:', typeUuid);

        if (typeUuid) {
          // ✅ ACTUALIZAR FORMULARIO
          this.assignmentForm.patchValue({
            sessionType: sessionType,  // ✅ Campo de formulario
            sessionTypeUuid: typeUuid  // ✅ UUID para el backend
          });

          // ✅ ACTUALIZAR ESTADO
          this.selectionState.teachingType = {
            uuid: typeUuid,
            name: sessionType
          };

          console.log('✅ Form updated with sessionType:', sessionType, 'and UUID:', typeUuid);

          // Ir al paso de selección de docente
          this.currentStep = 3;
          this.loadEligibleTeachers(this.selectionState.course!.uuid);
        } else {
          console.error('❌ No se pudo obtener el UUID del tipo de sesión:', sessionType);
          this.snackBar.open('Error al configurar el tipo de sesión', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private loadEligibleTeachers(courseUuid: string): void {
    this.loadingTeachers = true;
    this.eligibleTeachers = [];
    this.groupedTeachers = {
      available: [],
      withConflicts: [],
      unavailable: [],
      noSchedule: []
    };

    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString() : undefined;
    const teachingHourUuids = this.selectionState.selectedHours.map(h => h.uuid);

    console.log('=== LOADING TEACHERS WITH CONFLICT DETECTION ===');
    console.log('Course UUID:', courseUuid);
    console.log('Day:', dayOfWeekStr);
    console.log('Selected Hours:', teachingHourUuids);

    this.classSessionService.getEligibleTeachersDetailed(
      courseUuid,
      dayOfWeekStr,
      this.data.timeSlotUuid,
      teachingHourUuids
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.eligibleTeachersDetailed = Array.isArray(response.data) ? response.data : [response.data];

          // ✅ NUEVA LÓGICA: Agrupar docentes por categorías
          this.groupTeachersByAvailability();

          console.log('✅ Teachers grouped successfully:');
          console.log('  - Available:', this.groupedTeachers.available.length);
          console.log('  - With Conflicts:', this.groupedTeachers.withConflicts.length);
          console.log('  - Unavailable:', this.groupedTeachers.unavailable.length);
          console.log('  - No Schedule:', this.groupedTeachers.noSchedule.length);

          this.loadingTeachers = false;
          this.loadIntelliSense();
        },
        error: (error) => {
          console.error('❌ Error loading teachers:', error);
          this.snackBar.open('Error al cargar docentes', 'Cerrar', { duration: 3000 });
          this.loadingTeachers = false;
        }
      });
  }
  // ✅ NUEVO MÉTODO: Agrupar docentes por disponibilidad y conflictos
  private groupTeachersByAvailability(): void {
    this.groupedTeachers = {
      available: [],
      withConflicts: [],
      unavailable: [],
      noSchedule: []
    };

    this.eligibleTeachersDetailed.forEach(teacher => {
      console.log(`Teacher: ${teacher.fullName}, Status: ${teacher.availabilityStatus}`);

      switch (teacher.availabilityStatus) {
        case 'AVAILABLE':
          this.groupedTeachers.available.push(teacher);
          break;

        case 'SCHEDULE_CONFLICT':
        case 'PARTIAL_CONFLICT':
          this.groupedTeachers.withConflicts.push(teacher);
          break;

        case 'NO_SCHEDULE_CONFIGURED':
          this.groupedTeachers.noSchedule.push(teacher);
          break;

        case 'TIME_CONFLICT':
        case 'NOT_AVAILABLE':
          this.groupedTeachers.unavailable.push(teacher);
          break;

        case 'ERROR':
        default:
          // ✅ NUEVO: Manejar estados no definidos - revisar qué status están llegando
          console.warn(`Unknown teacher status: ${teacher.availabilityStatus} for ${teacher.fullName}`);
          this.groupedTeachers.unavailable.push(teacher);
          break;
      }
    });

    // Logging para debug
    console.log('✅ Teachers grouped:');
    console.log('  - Available:', this.groupedTeachers.available.length);
    console.log('  - With Conflicts:', this.groupedTeachers.withConflicts.length);
    console.log('  - Unavailable (fuera de horario):', this.groupedTeachers.unavailable.length);
    console.log('  - No Schedule:', this.groupedTeachers.noSchedule.length);

    // Ordenar cada grupo alfabéticamente
    Object.keys(this.groupedTeachers).forEach(key => {
      (this.groupedTeachers as any)[key].sort((a: TeacherEligibilityResponse, b: TeacherEligibilityResponse) =>
        a.fullName.localeCompare(b.fullName)
      );
    });
  }
  getAvailabilityIcon(status: TeacherAvailabilityStatus): string {
    const icons = {
      'AVAILABLE': 'check_circle',
      'SCHEDULE_CONFLICT': 'event_busy',
      'PARTIAL_CONFLICT': 'warning',
      'TIME_CONFLICT': 'schedule',
      'NOT_AVAILABLE': 'cancel',
      'NO_SCHEDULE_CONFIGURED': 'help_outline',
      'ERROR': 'error'
    };
    return icons[status] || 'help_outline';
  }

  getAvailabilityColor(status: TeacherAvailabilityStatus): string {
    const colors = {
      'AVAILABLE': 'text-green-600',
      'SCHEDULE_CONFLICT': 'text-red-600',
      'PARTIAL_CONFLICT': 'text-orange-600',
      'TIME_CONFLICT': 'text-yellow-600',
      'NOT_AVAILABLE': 'text-red-500',
      'NO_SCHEDULE_CONFIGURED': 'text-gray-500',
      'ERROR': 'text-red-700'
    };
    return colors[status] || 'text-gray-500';
  }

  getStatusDescription(status: TeacherAvailabilityStatus): string {
    const descriptions = {
      'AVAILABLE': 'Disponible para asignar',
      'SCHEDULE_CONFLICT': 'Tiene clases en este horario',
      'PARTIAL_CONFLICT': 'Conflicto parcial de horario',
      'TIME_CONFLICT': 'Fuera de horario de disponibilidad',
      'NOT_AVAILABLE': 'No disponible',
      'NO_SCHEDULE_CONFIGURED': 'Sin horario configurado',
      'ERROR': 'Error al verificar disponibilidad'
    };
    return descriptions[status] || 'Estado desconocido';
  }
  // ✅ REEMPLAZAR TODO EL MÉTODO
  onTeacherSelectedWithConflictCheck(teacherUuid: string): void {
    const teacher = this.eligibleTeachersDetailed.find(t => t.uuid === teacherUuid);
    if (!teacher) return;
    // ✅ NUEVO: Si el docente tiene conflictos de clases, mostrar mensaje y navegar
    if (teacher.hasScheduleConflict && teacher.conflictingClasses && teacher.conflictingClasses.length > 0) {
      this.handleTeacherConflict(teacher);
      return;
    }
    // Si no tiene conflictos, proceder normalmente
    this.selectTeacher(teacher);
  }
  // ✅ NUEVO MÉTODO: Manejar conflicto de docente
  public handleTeacherConflict(teacher: TeacherEligibilityResponse): void {
    if (!teacher.conflictingClasses || teacher.conflictingClasses.length === 0) return;

    const conflict = teacher.conflictingClasses[0]; // Tomar el primer conflicto
    const conflictGroupUuid = conflict.studentGroupUuid;

    // Mostrar snackbar con información y opción de navegar
    const snackBarRef = this.snackBar.open(
      `${teacher.fullName} tiene una clase de ${conflict.courseName} con ${conflict.studentGroupName}. ¿Ver horario del grupo para resolver el conflicto?`,
      'Ver Horario',
      {
        duration: 8000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['conflict-snackbar']
      }
    );

    // Manejar click en el botón
    snackBarRef.onAction().subscribe(() => {
      this.navigateToGroupSchedule(conflictGroupUuid);
    });
  }
// ✅ NUEVO MÉTODO: Navegar al horario del grupo en conflicto
  private navigateToGroupSchedule(groupUuid: string): void {
    // Cerrar el diálogo actual
    this.dialogRef.close();

    // Navegar al horario por grupo con el grupo específico seleccionado
    this.router.navigate(['/dashboard/horarios/by-group'], {
      queryParams: { groupUuid: groupUuid }
    });
  }
  // ✅ NUEVO MÉTODO: Seleccionar docente sin conflictos
  private selectTeacher(teacherDetailed: TeacherEligibilityResponse): void {
    this.selectionState.teacher = {
      uuid: teacherDetailed.uuid,
      fullName: teacherDetailed.fullName,
      email: teacherDetailed.email,
      department: teacherDetailed.department,
      knowledgeAreas: teacherDetailed.knowledgeAreas,
      hasUserAccount: teacherDetailed.hasUserAccount,
      totalAvailabilities: 0
    };

    // Actualizar formulario
    this.assignmentForm.patchValue({
      teacherUuid: teacherDetailed.uuid
    });

    this.currentStep = 4; // Ir al paso de selección de aula
    this.loadEligibleSpaces();
  }




  // ✅ NUEVO: Toggle para mostrar/ocultar detalles de conflictos
  toggleConflictDetails(): void {
    this.showConflictDetails = !this.showConflictDetails;
  }

  // ✅ NUEVO: Obtener resumen de conflictos para un docente
  getConflictSummary(teacher: TeacherEligibilityResponse): string {
    if (!teacher.conflictingClasses || teacher.conflictingClasses.length === 0) {
      return '';
    }

    if (teacher.conflictingClasses.length === 1) {
      const conflict = teacher.conflictingClasses[0];
      return `${conflict.courseName} - ${conflict.studentGroupName}`;
    }

    return `${teacher.conflictingClasses.length} clases en conflicto`;
  }

  // ✅ NUEVO: Verificar si un docente puede ser seleccionado
  canSelectTeacher(teacher: TeacherEligibilityResponse): boolean {
    return teacher.availabilityStatus === 'AVAILABLE' ||
      teacher.availabilityStatus === 'SCHEDULE_CONFLICT' ||
      teacher.availabilityStatus === 'PARTIAL_CONFLICT';
  }

  // ✅ NUEVO: Obtener mensaje de ayuda para cada categoría
  getCategoryHelpText(category: keyof GroupedTeachers): string {
    const helpTexts = {
      available: 'Docentes que pueden ser asignados sin conflictos en este horario',
      withConflicts: 'Docentes que tienen clases en el mismo horario - requieren confirmación',
      unavailable: 'Docentes con horarios configurados pero fuera de su disponibilidad para este horario específico',
      noSchedule: 'Docentes sin horario de disponibilidad configurado para este día - verificar manualmente'
    };
    return helpTexts[category];
  }


  getAvailabilityClass(status: string): string {
    switch(status) {
      case 'AVAILABLE': return 'status-available';
      case 'TIME_CONFLICT': return 'status-conflict';
      case 'NOT_AVAILABLE': return 'status-not-available';
      case 'NO_SCHEDULE_CONFIGURED': return 'status-no-schedule';
      default: return 'status-error';
    }
  }

  getAvailabilityText(status: string): string {
    switch(status) {
      case 'AVAILABLE': return 'Disponible';
      case 'TIME_CONFLICT': return 'Conflicto de horario';
      case 'NOT_AVAILABLE': return 'No disponible';
      case 'NO_SCHEDULE_CONFIGURED': return 'Sin horario';
      default: return 'Error';
    }
  }

  onTeacherSelected(teacherUuid: string): void {
    const teacherDetailed = this.eligibleTeachersDetailed.find(t => t.uuid === teacherUuid);
    if (teacherDetailed) {
      this.selectionState.teacher = {
        uuid: teacherDetailed.uuid,
        fullName: teacherDetailed.fullName,
        email: teacherDetailed.email,
        department: teacherDetailed.department,
        knowledgeAreas: teacherDetailed.knowledgeAreas,
        hasUserAccount: teacherDetailed.hasUserAccount,
        totalAvailabilities: 0
      };

      this.currentStep = 4; // Ir al paso de selección de aula
      this.loadEligibleSpaces();
    }
  }

  // ✅ MÉTODO COMPLETAMENTE CORREGIDO: Cargar aulas elegibles
  private loadEligibleSpaces(): void {
    if (!this.selectionState.course || !this.selectionState.selectedSessionType) {
      console.log('❌ Cannot load spaces: missing course or session type');
      return;
    }

    console.log('=== LOADING ELIGIBLE SPACES (FINAL VERSION) ===');
    console.log('Course:', this.selectionState.course.name);
    console.log('Selected session type:', this.selectionState.selectedSessionType);
    console.log('Selected hours:', this.selectionState.selectedHours);

    this.loadingSpaces = true;
    this.eligibleSpaces = [];

    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString().toUpperCase() : undefined;
    const teachingHourUuids = this.selectionState.selectedHours.map(h => h.uuid);

    console.log('Request parameters:');
    console.log('- Course UUID:', this.selectionState.course.uuid);
    console.log('- Day of week:', dayOfWeekStr);
    console.log('- TimeSlot UUID:', this.data.timeSlotUuid);
    console.log('- Teaching hour UUIDs:', teachingHourUuids);
    console.log('- Session type:', this.selectionState.selectedSessionType);

    // ✅ LLAMADA MEJORADA: Pasar sessionType al backend
    this.classSessionService.getEligibleSpaces(
      this.selectionState.course.uuid,
      dayOfWeekStr,
      this.data.timeSlotUuid,
      teachingHourUuids,
      this.selectionState.selectedSessionType // ✅ NUEVO PARÁMETRO
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Backend response:', response);

          let allSpaces = Array.isArray(response.data) ? response.data : [response.data];
          console.log('Spaces returned by backend:', allSpaces.length);

          // ✅ AHORA EL BACKEND YA DEBERÍA FILTRAR, PERO MANTENEMOS VERIFICACIÓN
          this.eligibleSpaces = allSpaces.filter(space => {
            const spaceType = space.teachingType?.name;

            if (!spaceType) {
              console.log(`❌ Space ${space.name} has no teaching type`);
              return false;
            }

            const matchesSessionType =
              (this.selectionState.selectedSessionType === 'THEORY' && spaceType === 'THEORY') ||
              (this.selectionState.selectedSessionType === 'PRACTICE' && spaceType === 'PRACTICE');

            console.log(`Space ${space.name}: type=${spaceType}, matches ${this.selectionState.selectedSessionType}=${matchesSessionType}`);

            // ✅ Si el backend ya filtró correctamente, esto debería ser siempre true
            if (!matchesSessionType) {
              console.warn(`⚠️ Backend returned space ${space.name} of type ${spaceType} but frontend requested ${this.selectionState.selectedSessionType}`);
            }

            return matchesSessionType;
          });

          console.log(`✅ Final filtered spaces: ${this.eligibleSpaces.length} ${this.selectionState.selectedSessionType} spaces`);

          // ✅ MENSAJE DE ERROR MEJORADO
          if (this.eligibleSpaces.length === 0) {
            const spaceTypeName = this.selectionState.selectedSessionType === 'THEORY' ? 'aulas teóricas' : 'laboratorios';
            console.log(`❌ No ${spaceTypeName} available for the specified hours`);

            this.snackBar.open(
              `No hay ${spaceTypeName} disponibles en este horario específico`,
              'Cerrar',
              { duration: 5000 }
            );
          } else {
            console.log(`✅ Found ${this.eligibleSpaces.length} available spaces:`);
            this.eligibleSpaces.forEach(space => {
              console.log(`  - ${space.name} (${space.teachingType.name}) - Capacity: ${space.capacity}`);
            });
          }

          this.groupSpaces();
          this.loadingSpaces = false;
        },
        error: (error) => {
          console.error('❌ Error loading spaces:', error);
          this.snackBar.open('Error al cargar aulas', 'Cerrar', { duration: 3000 });
          this.loadingSpaces = false;
        }
      });
  }

  private groupSpaces(): void {
    const groups = new Map<string, LearningSpaceResponse[]>();

    this.eligibleSpaces.forEach(space => {
      const type = space.teachingType?.name === 'THEORY' ? 'Aulas Teóricas' : 'Laboratorios';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(space);
    });

    this.groupedSpaces = Array.from(groups.entries()).map(([label, spaces]) => ({
      label,
      spaces: spaces.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }

  onSpaceSelected(spaceUuid: string): void {
    const space = this.eligibleSpaces.find(s => s.uuid === spaceUuid);
    if (space) {
      this.selectionState.learningSpace = space;
      this.currentStep = 5; // Ir al paso final de confirmación
    }
  }

  private loadIntelliSense(): void {
    if (!this.selectionState.course) return;

    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString() : undefined;

    const params = {
      courseUuid: this.selectionState.course.uuid,
      groupUuid: this.data.studentGroup?.uuid,
      dayOfWeek: dayOfWeekStr,
      timeSlotUuid: this.data.timeSlotUuid
    };

    this.classSessionService.getIntelliSense(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.intelliSense = response.data;
        },
        error: (error) => {
          console.error('Error loading IntelliSense:', error);
        }
      });
  }

  isMatchingKnowledgeArea(area: any): boolean {
    return this.selectionState.course?.teachingKnowledgeArea?.uuid === area?.uuid;
  }

  getDayName(day: DayOfWeek): string {
    const names: { [key in DayOfWeek]: string } = {
      [DayOfWeek.MONDAY]: 'Lunes',
      [DayOfWeek.TUESDAY]: 'Martes',
      [DayOfWeek.WEDNESDAY]: 'Miércoles',
      [DayOfWeek.THURSDAY]: 'Jueves',
      [DayOfWeek.FRIDAY]: 'Viernes',
      [DayOfWeek.SATURDAY]: 'Sábado',
      [DayOfWeek.SUNDAY]: 'Domingo'
    };
    return names[day];
  }

  formatTimeRange(hours: TeachingHourResponse[]): string {
    if (!hours || hours.length === 0) return '';

    if (hours.length === 1) {
      const hour = hours[0];
      return `${hour.startTime.substring(0, 5)} - ${hour.endTime.substring(0, 5)}`;
    }

    const sortedHours = [...hours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
    const first = sortedHours[0];
    const last = sortedHours[sortedHours.length - 1];

    return `${first.startTime.substring(0, 5)} - ${last.endTime.substring(0, 5)} (${hours.length} horas)`;
  }

  getMultiSelectionInfo(): string {
    if (!this.data.isMultiSelection || !this.data.selectedCells) {
      return '';
    }
    const cellCount = this.data.selectedCells.length;
    const timeRange = this.formatTimeRange(this.selectionState.selectedHours);
    return `${cellCount} hora${cellCount > 1 ? 's' : ''} pedagógica${cellCount > 1 ? 's' : ''} - ${timeRange}`;
  }

  private loadEditData(): void {
    const session = this.data.sessionToEdit;

    // ✅ IMPORTANTE: Cargar datos del formulario incluyendo sessionType
    this.assignmentForm.patchValue({
      courseUuid: session.course.uuid,
      sessionType: session.sessionType.name, // ✅ NUEVO
      teacherUuid: session.teacher.uuid,
      learningSpaceUuid: session.learningSpace.uuid,
      sessionTypeUuid: session.sessionType.uuid,
      notes: session.notes || ''
    });

    // Actualizar estado de selección
    this.selectionState = {
      course: session.course,
      selectedSessionType: session.sessionType.name, // ✅ NUEVO
      teacher: session.teacher,
      learningSpace: session.learningSpace,
      teachingType: session.sessionType,
      selectedHours: session.teachingHours
    };

    // ✅ Si es edición, generar opciones de tipo de sesión
    this.generateSessionTypeOptions(session.course);

    this.currentStep = 5; // Ir directo al paso final en modo edición
  }

  // ✅ MÉTODO onSave CORREGIDO
  onSave(): void {
    if (!this.assignmentForm.valid || !this.data.studentGroup || !this.data.dayOfWeek) {
      console.log('❌ Form validation failed');
      console.log('Form valid:', this.assignmentForm.valid);
      console.log('Form value:', this.assignmentForm.value);
      console.log('Form errors:', this.getFormErrors());
      return;
    }

    // ✅ VALIDACIÓN ADICIONAL
    if (!this.selectionState.selectedSessionType) {
      console.log('❌ No session type selected');
      this.snackBar.open('Debe seleccionar un tipo de sesión', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.assignmentForm.value.sessionTypeUuid) {
      console.log('❌ No session type UUID in form');
      this.snackBar.open('Error en la configuración del tipo de sesión', 'Cerrar', { duration: 3000 });
      return;
    }

    this.saving = true;

    const request: ClassSessionRequest = {
      studentGroupUuid: this.data.studentGroup.uuid,
      courseUuid: this.assignmentForm.value.courseUuid,
      teacherUuid: this.assignmentForm.value.teacherUuid,
      learningSpaceUuid: this.assignmentForm.value.learningSpaceUuid,
      dayOfWeek: this.data.dayOfWeek,
      sessionTypeUuid: this.assignmentForm.value.sessionTypeUuid, // ✅ Usar el UUID correcto
      teachingHourUuids: this.selectionState.selectedHours.map(h => h.uuid),
      notes: this.assignmentForm.value.notes
    };

    console.log('=== SAVING SESSION ===');
    console.log('Request payload:', request);
    console.log('Selected session type:', this.selectionState.selectedSessionType);
    console.log('Session type UUID:', request.sessionTypeUuid);

    const operation$ = this.data.mode === 'create'
      ? this.classSessionService.createSession(request)
      : this.classSessionService.updateSession(this.data.sessionToEdit.uuid, request);

    operation$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Session saved successfully:', response.data);
          this.snackBar.open(
            this.data.mode === 'create' ? 'Clase asignada exitosamente' : 'Clase actualizada exitosamente',
            'Cerrar',
            { duration: 3000 }
          );
          this.dialogRef.close(response.data);
        },
        error: (error) => {
          console.error('❌ Error saving session:', error);
          this.snackBar.open(
            error.error?.message || 'Error al guardar la asignación',
            'Cerrar',
            { duration: 5000 }
          );
          this.saving = false;
        }
      });
  }

// ✅ MÉTODO AUXILIAR para debugging
  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.assignmentForm.controls).forEach(key => {
      const control = this.assignmentForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
