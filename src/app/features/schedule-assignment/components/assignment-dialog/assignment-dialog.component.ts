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
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Nueva Asignación de Clase' : 'Editar Asignación' }}
    </h2>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="assignmentForm">

        <!-- Información del contexto -->
        <div class="context-info">
          <mat-chip-set>
            <mat-chip *ngIf="data.studentGroup">
              <mat-icon>groups</mat-icon>
              Grupo: {{ data.studentGroup.name }}
            </mat-chip>
            <mat-chip *ngIf="data.dayOfWeek">
              <mat-icon>today</mat-icon>
              {{ getDayName(data.dayOfWeek) }}
            </mat-chip>
            <mat-chip *ngIf="data.teachingHours && data.teachingHours.length > 0">
              <mat-icon>schedule</mat-icon>
              {{ formatTimeRange(data.teachingHours) }}
            </mat-chip>
          </mat-chip-set>
        </div>

        <!-- Step 1: Selección de Curso -->
        <mat-expansion-panel [expanded]="currentStep === 1" (opened)="currentStep = 1">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <span class="step-number">1</span>
              Seleccionar Curso
            </mat-panel-title>
            <mat-panel-description *ngIf="selectionState.course">
              {{ selectionState.course.name }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="step-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Curso</mat-label>
              <mat-select formControlName="courseUuid" (selectionChange)="onCourseSelected($event.value)">
                <mat-option>
                  <ngx-mat-select-search
                    [formControl]="courseFilterCtrl"
                    placeholderLabel="Buscar curso..."
                    noEntriesFoundLabel="No se encontraron cursos">
                  </ngx-mat-select-search>
                </mat-option>
                <mat-option *ngFor="let course of filteredCourses$ | async" [value]="course.uuid">
                  <div class="option-content">
                    <span class="option-main">{{ course.name }}</span>
                    <span class="option-secondary">{{ course.code }} - Ciclo {{ course.cycle.number }}</span>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="loadingCourses">Cargando cursos...</mat-hint>
            </mat-form-field>

            <!-- IntelliSense para curso -->
            <div class="intellisense-panel" *ngIf="selectionState.course">
              <div class="course-details">
                <div class="detail-item">
                  <mat-icon>access_time</mat-icon>
                  <span>{{ selectionState.course.weeklyTheoryHours }}h teoría,
                    {{ selectionState.course.weeklyPracticeHours }}h práctica</span>
                </div>
                <div class="detail-item">
                  <mat-icon>psychology</mat-icon>
                  <span>Área: {{ selectionState.course.teachingKnowledgeArea.name }}</span>
                </div>
                <div class="detail-item" *ngIf="selectionState.course.preferredSpecialty">
                  <mat-icon>science</mat-icon>
                  <span>Laboratorio preferido: {{ selectionState.course.preferredSpecialty.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- Step 2: Selección de Docente -->
        <mat-expansion-panel [expanded]="currentStep === 2"
                             [disabled]="!selectionState.course"
                             (opened)="currentStep = 2">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <span class="step-number">2</span>
              Seleccionar Docente
            </mat-panel-title>
            <mat-panel-description *ngIf="selectionState.teacher">
              {{ selectionState.teacher.fullName }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="step-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Docente</mat-label>
              <mat-select formControlName="teacherUuid" (selectionChange)="onTeacherSelected($event.value)">
                <!-- ✅ Cambiar para usar eligibleTeachersDetailed -->
                <mat-option *ngFor="let teacher of eligibleTeachersDetailed"
                            [value]="teacher.uuid"
                            [disabled]="!teacher.isAvailableForTimeSlot">
                  <div class="option-content">
                    <div class="teacher-info">
                      <span class="option-main">{{ teacher.fullName }}</span>

                      <!-- ✅ Indicador de disponibilidad -->
                      <mat-chip [class]="getAvailabilityClass(teacher.availabilityStatus)">
                        {{ getAvailabilityText(teacher.availabilityStatus) }}
                      </mat-chip>
                    </div>

                    <!-- ✅ Mostrar horarios recomendados si no está disponible -->
                    <div *ngIf="!teacher.isAvailableForTimeSlot && teacher.recommendedTimeSlots"
                         class="recommended-times">
                      <mat-icon>schedule</mat-icon>
                      Disponible: {{ teacher.recommendedTimeSlots }}
                    </div>

                    <div class="option-tags">
                      <mat-chip *ngFor="let area of teacher.knowledgeAreas"
                                [class.highlight]="isMatchingKnowledgeArea(area)">
                        {{ area.name }}
                      </mat-chip>
                    </div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="loadingTeachers">
                <mat-spinner diameter="16"></mat-spinner>
                Buscando docentes disponibles...
              </mat-hint>
              <mat-hint *ngIf="!loadingTeachers && eligibleTeachersDetailed.length === 0">
                No hay docentes disponibles con el área de conocimiento requerida
              </mat-hint>
            </mat-form-field>


            <!-- Recomendaciones de docentes -->
            <div class="recommendations" *ngIf="(intelliSense?.recommendations?.length ?? 0) > 0">
              <h4>
                <mat-icon>lightbulb</mat-icon>
                Recomendaciones
              </h4>
               <mat-list>
                <mat-list-item *ngFor="let rec of (intelliSense?.recommendations ?? [])">
                  <mat-icon matListItemIcon>check_circle</mat-icon>
                  <span matListItemTitle>{{ rec }}</span>
                </mat-list-item>
              </mat-list>
            </div>
          </div>
        </mat-expansion-panel>

        <!-- Step 3: Selección de Aula -->
        <mat-expansion-panel [expanded]="currentStep === 3"
                             [disabled]="!selectionState.teacher"
                             (opened)="currentStep = 3">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <span class="step-number">3</span>
              Seleccionar Aula
            </mat-panel-title>
            <mat-panel-description *ngIf="selectionState.learningSpace">
              {{ selectionState.learningSpace.name }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="step-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Aula/Laboratorio</mat-label>
              <mat-select formControlName="learningSpaceUuid" (selectionChange)="onSpaceSelected($event.value)">
                <mat-optgroup *ngFor="let group of groupedSpaces" [label]="group.label">
                  <mat-option *ngFor="let space of group.spaces" [value]="space.uuid">
                    <div class="option-content">
                      <span class="option-main">{{ space.name }}</span>
                      <span class="option-secondary">
                        Capacidad: {{ space.capacity }} -
                        {{ space.teachingType.name === 'THEORY' ? 'Teórica' : 'Práctica' }}
                        <span *ngIf="space.specialty"> - {{ space.specialty.name }}</span>
                      </span>
                    </div>
                  </mat-option>
                </mat-optgroup>
              </mat-select>
              <mat-hint *ngIf="loadingSpaces">
                <mat-spinner diameter="16"></mat-spinner>
                Verificando disponibilidad de aulas...
              </mat-hint>
            </mat-form-field>
          </div>
        </mat-expansion-panel>

        <!-- Step 4: Confirmación y Validación -->
        <mat-expansion-panel [expanded]="currentStep === 4"
                             [disabled]="!selectionState.learningSpace"
                             (opened)="currentStep = 4">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <span class="step-number">4</span>
              Confirmar Asignación
            </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="step-content">
            <!-- Resumen de la asignación -->
            <div class="assignment-summary">
              <h4>Resumen de la Asignación</h4>
              <mat-list>
                <mat-list-item>
                  <mat-icon matListItemIcon>book</mat-icon>
                  <span matListItemTitle>{{ selectionState.course?.name }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListItemIcon>person</mat-icon>
                  <span matListItemTitle>{{ selectionState.teacher?.fullName }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListItemIcon>room</mat-icon>
                  <span matListItemTitle>{{ selectionState.learningSpace?.name }}</span>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListItemIcon>schedule</mat-icon>
                  <span matListItemTitle>{{ formatTimeRange(data.teachingHours || []) }}</span>
                </mat-list-item>
              </mat-list>
            </div>

            <!-- Notas adicionales -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notas (Opcional)</mat-label>
              <textarea matInput
                        formControlName="notes"
                        rows="3"
                        placeholder="Agregar observaciones o notas sobre esta clase...">
              </textarea>
            </mat-form-field>

            <!-- Validación en tiempo real -->
            <div class="validation-panel" *ngIf="validationResult">
              <div class="validation-section" *ngIf="validationResult.errors.length > 0">
                <h4 class="error-title">
                  <mat-icon>error</mat-icon>
                  Errores
                </h4>
                <mat-list>
                  <mat-list-item *ngFor="let error of validationResult.errors">
                    <mat-icon matListItemIcon color="warn">cancel</mat-icon>
                    <span matListItemTitle>{{ error }}</span>
                  </mat-list-item>
                </mat-list>
              </div>

              <div class="validation-section" *ngIf="validationResult.warnings.length > 0">
                <h4 class="warning-title">
                  <mat-icon>warning</mat-icon>
                  Advertencias
                </h4>
                <mat-list>
                  <mat-list-item *ngFor="let warning of validationResult.warnings">
                    <mat-icon matListItemIcon color="accent">warning</mat-icon>
                    <span matListItemTitle>{{ warning }}</span>
                  </mat-list-item>
                </mat-list>
              </div>

              <div class="validation-section" *ngIf="validationResult.suggestions.length > 0">
                <h4 class="suggestion-title">
                  <mat-icon>lightbulb</mat-icon>
                  Sugerencias
                </h4>
                <mat-list>
                  <mat-list-item *ngFor="let suggestion of validationResult.suggestions">
                    <mat-icon matListItemIcon>tips_and_updates</mat-icon>
                    <span matListItemTitle>{{ suggestion }}</span>
                  </mat-list-item>
                </mat-list>
              </div>
            </div>
          </div>
        </mat-expansion-panel>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>

      <button mat-raised-button
              color="primary"
              (click)="onSave()"
              [disabled]="!canSave">
        <mat-spinner diameter="20" *ngIf="saving"></mat-spinner>
        {{ saving ? 'Guardando...' : (data.mode === 'create' ? 'Crear' : 'Actualizar') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .context-info {
      margin-bottom: 20px;
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3f51b5;
      color: white;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }

    .step-content {
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .option-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .option-main {
      font-weight: 500;
    }

    .option-secondary {
      font-size: 0.85em;
      color: #666;
    }

    .option-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .option-tags mat-chip {
      font-size: 0.75em;
      min-height: 20px;
      padding: 2px 8px;
    }

    .option-tags mat-chip.highlight {
      background-color: #4caf50;
      color: white;
    }

    .intellisense-panel {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }

    .course-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
    }

    .detail-item mat-icon {
      font-size: 18px;
      color: #666;
    }

    .recommendations {
      background: #e3f2fd;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }

    .recommendations h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .assignment-summary {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .assignment-summary h4 {
      margin-top: 0;
    }

    .validation-panel {
      margin-top: 16px;
    }

    .validation-section {
      margin-bottom: 16px;
    }

    .validation-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
    }

    .error-title {
      color: #f44336;
    }

    .warning-title {
      color: #ff9800;
    }

    .suggestion-title {
      color: #2196f3;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    ngx-mat-select-search {
      width: 100%;
      padding: 8px;
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 16px;
    }

    @media (max-width: 600px) {
      .dialog-content {
        width: 100%;
        max-width: 90vw;
      }
    }
    .status-available { background-color: #4caf50; color: white; }
    .status-conflict { background-color: #ff9800; color: white; }
    .status-not-available { background-color: #f44336; color: white; }
    .status-no-schedule { background-color: #9e9e9e; color: white; }
    .status-error { background-color: #e91e63; color: white; }

    .recommended-times {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8em;
      color: #666;
      margin-top: 4px;
    }
    /* Ya tienes estos estilos, pero asegúrate de que estén completos */
    .teacher-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 4px;
    }

    .teacher-info .option-main {
      flex: 1;
    }

    .teacher-info mat-chip {
      font-size: 0.7em;
      min-height: 18px;
      margin-left: 8px;
    }

    .recommended-times {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8em;
      color: #666;
      margin-top: 4px;
      padding: 4px 8px;
      background-color: #fff3cd;
      border-radius: 4px;
      border-left: 3px solid #ff9800;
    }

    .recommended-times mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Estilos para opciones deshabilitadas */
    mat-option[disabled] {
      opacity: 0.6;
    }

    mat-option[disabled] .option-content {
      color: #999;
    }
  `]

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
