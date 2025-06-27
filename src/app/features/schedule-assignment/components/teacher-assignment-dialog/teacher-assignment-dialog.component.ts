// src/app/features/schedule-assignment/components/teacher-assignment-dialog/teacher-assignment-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';

// Services
import { ClassSessionService } from '../../services/class-session.service';
import { CourseService } from '../../../courses/services/course.service';
import { StudentGroupService } from '../../../student-groups/services/student-group.service';
import { TeachingTypeService } from '../../services/teaching-type.service';
import { CarreraService } from '../../../Careers/services/carrera.service';
import { CareerResponse } from '../../../Careers/models/carrera.model';

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
  TeachingTypeResponse,
} from '../../models/class-session.model';

// ✅ USAR TUS INTERFACES EXISTENTES
import { Career } from '../../../student-groups/services/student-group.service';
import { Course } from '../../../courses/services/course.service';

// Interfaces específicas para este diálogo
interface CareerOption {
  uuid: string;
  name: string;
  modalityName: string;
  cycleCount: number;
}

interface CycleOption {
  uuid: string;
  number: number;
  careerName: string;
}

interface GroupOption {
  uuid: string;
  name: string;
  cycleNumber: number;
  careerName: string;
  modalityName: string;
  periodName: string;
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

export interface TeacherAssignmentDialogData {
  mode: 'create' | 'edit';
  teacher: TeacherResponse;
  dayOfWeek?: DayOfWeek;
  teachingHours?: TeachingHourResponse[];
  timeSlotUuid?: string;
  sessionToEdit?: any;
}

@Component({
  selector: 'app-teacher-assignment-dialog',
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
    MatExpansionModule,
    MatSnackBarModule,
    MatSelectSearchComponent,
    MatRadioModule
  ],
  templateUrl: './teacher-assignment-dialog.component.html',
  styleUrls: ['./teacher-assignment-dialog.component.scss']
})
export class TeacherAssignmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private classSessionService = inject(ClassSessionService);
  private courseService = inject(CourseService);
  private studentGroupService = inject(StudentGroupService);
  private teachingTypeService = inject(TeachingTypeService);
  private careerService = inject(CarreraService);

  // Form
  assignmentForm: FormGroup;

  // Filtros para grupos
  careerFilterCtrl = new FormControl('');
  cycleFilterCtrl = new FormControl('');
  groupFilterCtrl = new FormControl('');
  courseFilterCtrl = new FormControl('');

  // State
  currentStep = 1;

  // Data arrays
  careers: CareerOption[] = [];
  cycles: CycleOption[] = [];
  allGroups: GroupOption[] = [];
  filteredGroups$ = new BehaviorSubject<GroupOption[]>([]);

  courses: any[] = [];
  filteredCourses$ = new BehaviorSubject<Course[]>([]);

  eligibleSpaces: LearningSpaceResponse[] = [];
  sessionTypeOptions: SessionTypeOption[] = [];

  // Selection state
  selectedGroup: GroupOption | null = null;
  selectedCourse: Course | null = null;
  selectedSessionType: 'THEORY' | 'PRACTICE' | null = null;
  selectedTeachingType: TeachingTypeResponse | null = null;
  selectedSpace: LearningSpaceResponse | null = null;

  // Validation
  validationResult: ValidationResult | null = null;

  // Loading states
  loadingCareers = false;
  loadingGroups = false;
  loadingCourses = false;
  loadingSpaces = false;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<TeacherAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeacherAssignmentDialogData
  ) {
    this.assignmentForm = this.fb.group({
      careerUuid: ['', Validators.required],
      cycleUuid: ['', Validators.required],
      studentGroupUuid: ['', Validators.required],
      courseUuid: ['', Validators.required],
      sessionType: ['', Validators.required],
      sessionTypeUuid: ['', Validators.required],
      learningSpaceUuid: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
    this.setupValidation();

    // Cargar tipos de enseñanza
    this.teachingTypeService.ensureTypesLoaded()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    // Si es modo edición, cargar los datos
    if (this.data.mode === 'edit' && this.data.sessionToEdit) {
      this.loadEditData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loadCareers();
    this.loadAllGroups();
  }

  // ✅ ADAPTADO: Usar tu servicio existente
  private loadCareers(): void {
    this.loadingCareers = true;

    this.careerService.getAllCareers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const allCareers: any[] = Array.isArray(response.data) ? response.data : [response.data];

          this.careers = allCareers.map((career: Career) => ({
            uuid: career.uuid,
            name: career.name,
            modalityName: career.modality.name,
            cycleCount: career.cycles?.length || 0
          }));

          this.loadingCareers = false;
          console.log('Careers loaded:', this.careers.length);
        },
        error: (error) => {
          console.error('Error loading careers:', error);
          this.snackBar.open('Error al cargar carreras', 'Cerrar', { duration: 3000 });
          this.loadingCareers = false;
        }
      });
  }

  // ✅ ADAPTADO: Usar tu servicio existente
  private loadAllGroups(): void {
    this.loadingGroups = true;

    this.studentGroupService.getAllGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // ✅ USAR TU INTERFACE StudentGroup (no StudentGroupResponse)
          const allGroupsData: any[] = Array.isArray(response.data) ? response.data : [response.data];

          this.allGroups = allGroupsData.map((group: any) => ({
            uuid: group.uuid,
            name: group.name,
            cycleNumber: group.cycleNumber,
            careerName: group.careerName,
            modalityName: group.modalityName || '',
            periodName: group.periodName
          }));

          this.filteredGroups$.next([...this.allGroups]);
          this.loadingGroups = false;
          console.log('Groups loaded:', this.allGroups.length);
        },
        error: (error) => {
          console.error('Error loading groups:', error);
          this.snackBar.open('Error al cargar grupos', 'Cerrar', { duration: 3000 });
          this.loadingGroups = false;
        }
      });
  }

  private setupFilters(): void {
    // Filtro por carrera
    this.assignmentForm.get('careerUuid')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(careerUuid => {
        this.onCareerSelected(careerUuid);
      });

    // Filtro por ciclo
    this.assignmentForm.get('cycleUuid')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cycleUuid => {
        this.onCycleSelected(cycleUuid);
      });

    // Filtro de búsqueda por texto en grupos
    this.groupFilterCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterGroups(searchTerm || '');
      });

    // Filtro de búsqueda por texto en cursos
    this.courseFilterCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterCourses(searchTerm || '');
      });
  }

  private setupValidation(): void {
    combineLatest([
      this.assignmentForm.get('courseUuid')!.valueChanges,
      this.assignmentForm.get('learningSpaceUuid')!.valueChanges,
      this.assignmentForm.get('sessionTypeUuid')!.valueChanges
    ]).pipe(
      debounceTime(500),
      switchMap(([courseUuid, spaceUuid, sessionTypeUuid]) => {
        if (courseUuid && spaceUuid && sessionTypeUuid &&
          this.data.dayOfWeek && this.data.teachingHours?.length) {

          const validation = {
            courseUuid,
            teacherUuid: this.data.teacher.uuid,
            learningSpaceUuid: spaceUuid,
            studentGroupUuid: this.assignmentForm.get('studentGroupUuid')?.value || '',
            dayOfWeek: this.data.dayOfWeek.toString(),
            teachingHourUuids: this.data.teachingHours!.map(h => h.uuid),
            sessionTypeUuid,
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

  // === MÉTODOS DE SELECCIÓN ===

  private onCareerSelected(careerUuid: string): void {
    if (!careerUuid) {
      this.cycles = [];
      this.filterGroups();
      return;
    }

    // Generar ciclos basado en la carrera seleccionada
    const selectedCareer = this.careers.find(c => c.uuid === careerUuid);
    if (selectedCareer) {
      this.cycles = Array.from({ length: selectedCareer.cycleCount }, (_, index) => ({
        uuid: `${careerUuid}-cycle-${index + 1}`, // UUID temporal para filtrado
        number: index + 1,
        careerName: selectedCareer.name
      }));
    }

    // Limpiar selección de ciclo
    this.assignmentForm.patchValue({ cycleUuid: '' });

    // Filtrar grupos por carrera
    this.filterGroups();
  }

  private onCycleSelected(cycleUuid: string): void {
    // Filtrar grupos por carrera y ciclo
    this.filterGroups();
  }

  private filterGroups(searchTerm: string = ''): void {
    let filtered = [...this.allGroups];

    // Filtrar por carrera
    const selectedCareerUuid = this.assignmentForm.get('careerUuid')?.value;
    if (selectedCareerUuid) {
      const selectedCareer = this.careers.find(c => c.uuid === selectedCareerUuid);
      if (selectedCareer) {
        filtered = filtered.filter(group => group.careerName === selectedCareer.name);
      }
    }

    // Filtrar por ciclo
    const selectedCycleUuid = this.assignmentForm.get('cycleUuid')?.value;
    if (selectedCycleUuid) {
      const cycleNumber = parseInt(selectedCycleUuid.split('-cycle-')[1]);
      if (!isNaN(cycleNumber)) {
        filtered = filtered.filter(group => group.cycleNumber === cycleNumber);
      }
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(term) ||
        group.careerName.toLowerCase().includes(term) ||
        group.modalityName.toLowerCase().includes(term)
      );
    }

    this.filteredGroups$.next(filtered);
  }

  private filterCourses(searchTerm: string = ''): void {
    if (!searchTerm.trim()) {
      this.filteredCourses$.next([...this.courses]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = this.courses.filter(course =>
      course.name.toLowerCase().includes(term) ||
      course.code.toLowerCase().includes(term)
    );

    this.filteredCourses$.next(filtered);
  }

  onGroupSelected(groupUuid: string): void {
    const group = this.allGroups.find(g => g.uuid === groupUuid);
    if (group) {
      console.log('=== GROUP SELECTED ===');
      console.log('Group:', group);

      this.selectedGroup = group;
      this.currentStep = 2;
      this.loadCoursesForGroup(group);
    }
  }

  // ✅ ADAPTADO: Usar tu servicio de cursos existente
  private loadCoursesForGroup(group: GroupOption): void {
    this.loadingCourses = true;

    this.courseService.getAllCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const allCourses: any[] = Array.isArray(response.data) ? response.data : [response.data];

          // Filtrar cursos por ciclo Y carrera del grupo
          this.courses = allCourses.filter((course: Course) => {
            const sameCycleNumber = course.cycle.number === group.cycleNumber;
            const sameCareer = course.career.name === group.careerName;
            return sameCycleNumber && sameCareer;
          });

          console.log(`Cursos filtrados: ${this.courses.length} para ${group.careerName} ciclo ${group.cycleNumber}`);

          this.filteredCourses$.next([...this.courses]);
          this.loadingCourses = false;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.snackBar.open('Error al cargar cursos', 'Cerrar', { duration: 3000 });
          this.loadingCourses = false;
        }
      });
  }

  onCourseSelected(courseUuid: string): void {
    const course = this.courses.find(c => c.uuid === courseUuid);
    if (course) {
      console.log('=== COURSE SELECTED ===');
      console.log('Course:', course);

      this.selectedCourse = course;
      this.generateSessionTypeOptions(course);
      this.currentStep = 3;
    }
  }

  private generateSessionTypeOptions(course: any): void {
    this.sessionTypeOptions = [];

    // Obtener horas ya asignadas (esto requiere que hayamos cargado metadatos)
    const assignedTheoryHours = 0;
    const assignedPracticeHours = 0;

    console.log('=== GENERATING SESSION TYPE OPTIONS ===');
    console.log('Course:', course.name);
    console.log('Supported types:', course.teachingTypes.map((tt: any) => tt.name));
    const supportedTypes = course.teachingTypes.map((tt: any) => tt.name);

    // Opción TEORÍA
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

    // Opción PRÁCTICA
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
  }

  onSessionTypeSelected(sessionType: 'THEORY' | 'PRACTICE'): void {
    console.log('=== SESSION TYPE SELECTED ===');
    console.log('Selected type:', sessionType);

    this.selectedSessionType = sessionType;

    // Determinar el UUID del tipo de enseñanza
    this.teachingTypeService.ensureTypesLoaded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const typeUuid = this.teachingTypeService.getTypeUuidByName(sessionType);

        if (typeUuid) {
          this.selectedTeachingType = {
            uuid: typeUuid,
            name: sessionType
          };

          this.assignmentForm.patchValue({
            sessionType: sessionType,
            sessionTypeUuid: typeUuid
          });

          this.currentStep = 4;
          this.loadEligibleSpaces();
        } else {
          this.snackBar.open('Error al configurar el tipo de sesión', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private loadEligibleSpaces(): void {
    if (!this.selectedCourse || !this.selectedSessionType || !this.data.dayOfWeek || !this.data.teachingHours) {
      return;
    }

    this.loadingSpaces = true;

    const dayOfWeekStr = this.data.dayOfWeek.toString().toUpperCase();
    const teachingHourUuids = this.data.teachingHours.map(h => h.uuid);

    console.log('=== LOADING ELIGIBLE SPACES ===');
    console.log('Course UUID:', this.selectedCourse.uuid);
    console.log('Day:', dayOfWeekStr);
    console.log('Session type:', this.selectedSessionType);
    console.log('Teaching hours:', teachingHourUuids);

    this.classSessionService.getEligibleSpaces(
      this.selectedCourse.uuid,
      dayOfWeekStr,
      this.data.timeSlotUuid,
      teachingHourUuids,
      this.selectedSessionType
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.eligibleSpaces = Array.isArray(response.data) ? response.data : [response.data];
          console.log('Eligible spaces loaded:', this.eligibleSpaces.length);
          this.loadingSpaces = false;
        },
        error: (error) => {
          console.error('Error loading spaces:', error);
          this.snackBar.open('Error al cargar aulas', 'Cerrar', { duration: 3000 });
          this.loadingSpaces = false;
        }
      });
  }

  onSpaceSelected(spaceUuid: string): void {
    const space = this.eligibleSpaces.find(s => s.uuid === spaceUuid);
    if (space) {
      this.selectedSpace = space;
      this.currentStep = 5;
    }
  }

  // === MÉTODOS DE ACCIÓN ===

  get canSave(): boolean {
    const formValid = this.assignmentForm.valid;
    const notSaving = !this.saving;
    const noValidationErrors = !this.validationResult ||
      (this.validationResult.isValid === true) ||
      (!this.validationResult.errors || this.validationResult.errors.length === 0);

    return formValid && notSaving && noValidationErrors;
  }

  onSave(): void {
    if (!this.assignmentForm.valid || !this.data.dayOfWeek || !this.data.teachingHours) {
      console.log('❌ Form validation failed');
      return;
    }

    this.saving = true;

    const request: ClassSessionRequest = {
      studentGroupUuid: this.assignmentForm.value.studentGroupUuid,
      courseUuid: this.assignmentForm.value.courseUuid,
      teacherUuid: this.data.teacher.uuid,
      learningSpaceUuid: this.assignmentForm.value.learningSpaceUuid,
      dayOfWeek: this.data.dayOfWeek,
      sessionTypeUuid: this.assignmentForm.value.sessionTypeUuid,
      teachingHourUuids: this.data.teachingHours.map(h => h.uuid),
      notes: this.assignmentForm.value.notes
    };

    console.log('=== SAVING TEACHER SESSION ===');
    console.log('Request payload:', request);

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

  onCancel(): void {
    this.dialogRef.close();
  }

  private loadEditData(): void {
    // TODO: Implementar carga de datos para edición
    console.log('Load edit data - TODO');
  }

  // === MÉTODOS DE UI ===

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

  getGroupDisplayText(group: GroupOption): string {
    return `${group.name} - ${group.careerName} (Ciclo ${group.cycleNumber})`;
  }

  getCourseDisplayText(course: any): string {
    return `${course.name} (${course.code})`;
  }
}
