// src/app/features/schedule-assignment/components/assignment-dialog/assignment-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, takeUntil, startWith, switchMap, of, map } from 'rxjs';

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
  TeacherEligibilityResponse
} from '../../models/class-session.model';
import {MatSelectSearchComponent} from 'ngx-mat-select-search';

export interface AssignmentDialogData {
  mode: 'create' | 'edit';
  studentGroup?: StudentGroupResponse;
  dayOfWeek?: DayOfWeek;
  teachingHours?: TeachingHourResponse[];
  timeSlotUuid?: string;
  sessionToEdit?: any; // ClassSessionResponse para edición
}

interface SelectionState {
  course?: CourseResponse;
  teacher?: TeacherResponse;
  learningSpace?: LearningSpaceResponse;
  teachingType?: TeachingTypeResponse;
  selectedHours: TeachingHourResponse[];
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
    MatSelectSearchComponent
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

  // Form
  assignmentForm: FormGroup;
  courseFilterCtrl = this.fb.control('');

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
      teacherUuid: ['', Validators.required],
      learningSpaceUuid: ['', Validators.required],
      sessionTypeUuid: ['', Validators.required],
      notes: ['']
    });

    // Establecer horas seleccionadas
    if (data.teachingHours) {
      this.selectionState.selectedHours = data.teachingHours;
    }
  }

  ngOnInit(): void {
    this.loadCourses();
    this.setupCourseFilter();
    this.setupValidation();

    // Cargar tipos de enseñanza
    // en ngOnInit o justo antes de necesitar el UUID
    this.teachingTypeService.ensureTypesLoaded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // ahora sí podrás usar getTypeUuidByName(...)
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

            // ✅ SOLUCIÓN: Filtrar por ciclo Y carrera
            this.courses = allCourses.filter((course: CourseResponse) => {
              // Filtrar por número de ciclo
              const sameCycleNumber = course.cycle.number === this.data.studentGroup?.cycleNumber;

              // ✅ AGREGAR: Filtrar por carrera (usando el UUID de la carrera)
              // Necesitamos comparar la carrera del curso con la carrera del grupo
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
        startWith(''),           // arranca con '' en lugar de null
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        // fuerza a string no-nulo
        const term = (searchTerm ?? '').toLowerCase();

        const filtered = this.courses.filter(course =>
          course.name.toLowerCase().includes(term) ||
          course.code.toLowerCase().includes(term)
        );
        this.filteredCourses$.next(filtered);
      });
  }


  // En setupValidation method, agregar conversión:
  private setupValidation(): void {
    combineLatest([
      this.assignmentForm.get('courseUuid')!.valueChanges,
      this.assignmentForm.get('teacherUuid')!.valueChanges,
      this.assignmentForm.get('learningSpaceUuid')!.valueChanges
    ]).pipe(
      debounceTime(500),
      switchMap(([courseUuid, teacherUuid, spaceUuid]) => {
        if (courseUuid && teacherUuid && spaceUuid && this.data.dayOfWeek && this.selectionState.selectedHours.length > 0) {
          const validation: ClassSessionValidation = {
            courseUuid,
            teacherUuid,
            learningSpaceUuid: spaceUuid,
            studentGroupUuid: this.data.studentGroup?.uuid || '',
            dayOfWeek: this.data.dayOfWeek.toString(),
            teachingHourUuids: this.selectionState.selectedHours.map(h => h.uuid),
            // ✅ AGREGAR: sessionUuid para modo edición
            sessionUuid: this.data.mode === 'edit' ? this.data.sessionToEdit?.uuid : undefined
          };
          return this.classSessionService.validateAssignment(validation);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.validationResult = result;
    });
  }


  // Agregar este getter al componente
  get canSave(): boolean {
    const formValid = this.assignmentForm.valid;
    const notSaving = !this.saving;

    // Si no hay validationResult o no tiene errores, permitir guardar
    const noValidationErrors = !this.validationResult ||
      (this.validationResult.isValid === true) ||
      (!this.validationResult.errors || this.validationResult.errors.length === 0);

    return formValid && notSaving && noValidationErrors;
  }


  // También agregar logs en onCourseSelected
  onCourseSelected(courseUuid: string): void {
    const course = this.courses.find(c => c.uuid === courseUuid);
    if (course) {
      console.log('=== COURSE SELECTED ===');
      console.log('Course:', course);
      console.log('Weekly theory hours:', course.weeklyTheoryHours);
      console.log('Weekly practice hours:', course.weeklyPracticeHours);
      console.log('Teaching types:', course.teachingTypes);

      this.selectionState.course = course;
      this.currentStep = 2;

      // Determinar tipo de sesión
      const sessionTypeName = course.weeklyPracticeHours > 0 ? 'PRACTICE' : 'THEORY';
      console.log('Determined session type:', sessionTypeName);

      // El resto del código...
      this.teachingTypeService.getAllTeachingTypes()
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          console.log('Teaching types loaded:', response);
          const typeUuid = this.teachingTypeService.getTypeUuidByName(sessionTypeName);
          console.log('Session type UUID:', typeUuid);

          if (typeUuid) {
            this.assignmentForm.patchValue({ sessionTypeUuid: typeUuid });
          }
        });

      this.loadEligibleTeachers(courseUuid);
    }
  }

  // assignment-dialog.component.ts
  private loadEligibleTeachers(courseUuid: string): void {
    this.loadingTeachers = true;
    this.eligibleTeachers = [];

    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString() : undefined;

    // ✅ Usar el nuevo endpoint con timeSlotUuid
    this.classSessionService.getEligibleTeachersDetailed(
      courseUuid,
      dayOfWeekStr,
      this.data.timeSlotUuid  // ✅ Descomitar esta línea
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.eligibleTeachersDetailed = Array.isArray(response.data) ? response.data : [response.data];
          this.loadingTeachers = false;
          this.loadIntelliSense();
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
          this.snackBar.open('Error al cargar docentes', 'Cerrar', { duration: 3000 });
          this.loadingTeachers = false;
        }
      });
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
    // ✅ Buscar en eligibleTeachersDetailed
    const teacherDetailed = this.eligibleTeachersDetailed.find(t => t.uuid === teacherUuid);
    if (teacherDetailed) {
      // ✅ Convertir a TeacherResponse para compatibilidad
      this.selectionState.teacher = {
        uuid: teacherDetailed.uuid,
        fullName: teacherDetailed.fullName,
        email: teacherDetailed.email,
        department: teacherDetailed.department,
        knowledgeAreas: teacherDetailed.knowledgeAreas,
        hasUserAccount: teacherDetailed.hasUserAccount,
        totalAvailabilities: 0
      };

      this.currentStep = 3;
      this.loadEligibleSpaces();
    }
  }

  private loadEligibleSpaces(): void {
    if (!this.selectionState.course) return;

    console.log('=== LOADING ELIGIBLE SPACES (WITH SPECIFIC HOURS) ===');
    console.log('Course:', this.selectionState.course);
    console.log('Selected hours:', this.selectionState.selectedHours);

    this.loadingSpaces = true;
    this.eligibleSpaces = [];

    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString().toUpperCase() : undefined;

    // ✅ OBTENER las horas pedagógicas específicas que se quieren asignar
    const teachingHourUuids = this.selectionState.selectedHours.map(h => h.uuid);

    console.log('Day of week:', dayOfWeekStr);
    console.log('TimeSlot UUID:', this.data.timeSlotUuid);
    console.log('Teaching hour UUIDs being sent:', teachingHourUuids);

    this.classSessionService.getEligibleSpaces(
      this.selectionState.course.uuid,
      dayOfWeekStr,
      this.data.timeSlotUuid,
      teachingHourUuids  // ✅ ENVIAR LAS HORAS ESPECÍFICAS
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Eligible spaces response (with specific hours):', response);

          this.eligibleSpaces = Array.isArray(response.data) ? response.data : [response.data];

          console.log('Available spaces for specific hours:', this.eligibleSpaces.length);
          this.eligibleSpaces.forEach((space, index) => {
            console.log(`Space ${index + 1}:`, {
              name: space.name,
              type: space.teachingType.name,
              capacity: space.capacity
            });
          });

          if (this.eligibleSpaces.length === 0) {
            console.log('❌ No spaces available for these specific hours');
          } else {
            console.log('✅ Found available spaces for specific hours');
          }

          this.groupSpaces();
          this.loadingSpaces = false;
        },
        error: (error) => {
          console.error('Error loading spaces with specific hours:', error);
          this.snackBar.open('Error al cargar aulas', 'Cerrar', { duration: 3000 });
          this.loadingSpaces = false;
        }
      });
  }


  private groupSpaces(): void {
    const groups = new Map<string, LearningSpaceResponse[]>();

    this.eligibleSpaces.forEach(space => {
      const type = space.teachingType.name === 'THEORY' ? 'Aulas Teóricas' : 'Laboratorios';
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
      this.currentStep = 4;
    }
  }

  // En loadIntelliSense method:
  private loadIntelliSense(): void {
    if (!this.selectionState.course) return;

    // CORRECCIÓN: Convertir enum a string explícitamente
    const dayOfWeekStr = this.data.dayOfWeek ? this.data.dayOfWeek.toString() : undefined;

    const params = {
      courseUuid: this.selectionState.course.uuid,
      groupUuid: this.data.studentGroup?.uuid,
      dayOfWeek: dayOfWeekStr, // Usar la conversión a string
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
    return this.selectionState.course?.teachingKnowledgeArea.uuid === area.uuid;
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

    const sortedHours = [...hours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
    const first = sortedHours[0];
    const last = sortedHours[sortedHours.length - 1];

    return `${first.startTime.substring(0, 5)} - ${last.endTime.substring(0, 5)}`;
  }

  private loadEditData(): void {
    const session = this.data.sessionToEdit;

    // Cargar datos del formulario
    this.assignmentForm.patchValue({
      courseUuid: session.course.uuid,
      teacherUuid: session.teacher.uuid,
      learningSpaceUuid: session.learningSpace.uuid,
      sessionTypeUuid: session.sessionType.uuid,
      notes: session.notes || ''
    });

    // Actualizar estado de selección
    this.selectionState = {
      course: session.course,
      teacher: session.teacher,
      learningSpace: session.learningSpace,
      teachingType: session.sessionType,
      selectedHours: session.teachingHours
    };

    this.currentStep = 4;
  }

  onSave(): void {
    if (!this.assignmentForm.valid || !this.data.studentGroup || !this.data.dayOfWeek) {
      return;
    }

    this.saving = true;

    const request: ClassSessionRequest = {
      studentGroupUuid: this.data.studentGroup.uuid,
      courseUuid: this.assignmentForm.value.courseUuid,
      teacherUuid: this.assignmentForm.value.teacherUuid,
      learningSpaceUuid: this.assignmentForm.value.learningSpaceUuid,
      dayOfWeek: this.data.dayOfWeek,
      sessionTypeUuid: this.assignmentForm.value.sessionTypeUuid,
      teachingHourUuids: this.selectionState.selectedHours.map(h => h.uuid),
      notes: this.assignmentForm.value.notes
    };

    const operation$ = this.data.mode === 'create'
      ? this.classSessionService.createSession(request)
      : this.classSessionService.updateSession(this.data.sessionToEdit.uuid, request);

    operation$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.snackBar.open(
            this.data.mode === 'create' ? 'Clase asignada exitosamente' : 'Clase actualizada exitosamente',
            'Cerrar',
            { duration: 3000 }
          );
          this.dialogRef.close(response.data);
        },
        error: (error) => {
          console.error('Error saving session:', error);
          this.snackBar.open(
            error.error?.message || 'Error al guardar la asignación',
            'Cerrar',
            { duration: 5000 }
          );
          this.saving = false;
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
