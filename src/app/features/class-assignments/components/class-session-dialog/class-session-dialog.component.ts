// src/app/features/class-assignments/components/class-session-dialog/class-session-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil, combineLatest, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

// Services
import {
  ClassAssignmentService,
  ClassSession,
  Course,
  Teacher,
  StudentGroup,
  LearningSpace,
  TimeSlot,
  TeachingHour,
  ValidationResult
} from '../../services/class-assignment.service';

// Components
import { TeacherSelectorComponent } from '../teacher-selector/teacher-selector.component';
import { SpaceSelectorComponent } from '../space-selector/space-selector.component';
import { HourSelectorComponent } from '../hour-selector/hour-selector.component';

interface DialogData {
  isNew: boolean;
  session?: ClassSession;
  prefilledData?: any;
}

@Component({
  selector: 'app-class-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatStepperModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    MatExpansionModule,
    TeacherSelectorComponent,
    SpaceSelectorComponent,
    HourSelectorComponent
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isNew ? 'add_circle' : 'edit' }}</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Sesión de Clase
    </h2>

    <div mat-dialog-content class="dialog-content">
      <mat-stepper [linear]="true" #stepper>

        <!-- Paso 1: Selección Básica -->
        <mat-step [stepControl]="basicForm" label="Información Básica">
          <form [formGroup]="basicForm" class="step-form">

            <!-- Grupo de Estudiantes -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Grupo de Estudiantes</mat-label>
              <mat-select formControlName="studentGroupUuid" (selectionChange)="onGroupChange($event.value)">
                <mat-option value="">Seleccionar grupo</mat-option>
                <mat-option *ngFor="let group of studentGroups" [value]="group.uuid">
                  <div class="group-option">
                    <div class="group-main">
                      <span class="group-name">{{ group.name }}</span>
                      <mat-chip color="primary">Ciclo {{ group.cycleNumber }}</mat-chip>
                    </div>
                    <div class="group-period">{{ group.periodName }}</div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-error *ngIf="basicForm.controls['studentGroupUuid'].hasError('required')">
                Debe seleccionar un grupo
              </mat-error>
            </mat-form-field>

            <!-- Curso -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Curso</mat-label>
              <mat-select
                formControlName="courseUuid"
                (selectionChange)="onCourseChange($event.value)"
                [disabled]="!basicForm.value.studentGroupUuid">
                <mat-option value="">Seleccionar curso</mat-option>
                <mat-option *ngFor="let course of filteredCourses" [value]="course.uuid">
                  <div class="course-option">
                    <div class="course-header">
                      <span class="course-code">{{ course.code }}</span>
                      <mat-chip
                        [color]="getCourseTypeColor(course)"
                        class="course-type-chip">
                        {{ getCourseTypeText(course) }}
                      </mat-chip>
                    </div>
                    <div class="course-name">{{ course.name }}</div>
                    <div class="course-hours">
                      {{ course.weeklyTheoryHours }}h teóricas + {{ course.weeklyPracticeHours }}h prácticas
                    </div>
                    <div class="course-area">Área: {{ course.teachingKnowledgeArea.name }}</div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint>Filtrado por ciclo del grupo seleccionado</mat-hint>
              <mat-error *ngIf="basicForm.controls['courseUuid'].hasError('required')">
                Debe seleccionar un curso
              </mat-error>
            </mat-form-field>

            <!-- Día y Tipo de Sesión -->
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Día de la Semana</mat-label>
                <mat-select formControlName="dayOfWeek" (selectionChange)="onDayChange()">
                  <mat-option value="">Seleccionar día</mat-option>
                  <mat-option *ngFor="let day of daysOfWeek" [value]="day.value">
                    <div class="day-option">
                      <span class="day-name">{{ day.label }}</span>
                      <span class="day-load">{{ getDayWorkload(day.value) }} sesiones</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="basicForm.controls['dayOfWeek'].hasError('required')">
                  Debe seleccionar un día
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tipo de Sesión</mat-label>
                <mat-select
                  formControlName="sessionTypeUuid"
                  [disabled]="!basicForm.value.courseUuid">
                  <mat-option value="">Seleccionar tipo</mat-option>
                  <mat-option *ngFor="let type of availableSessionTypes" [value]="type.uuid">
                    <div class="session-type-option">
                      <mat-icon>{{ type.name === 'THEORY' ? 'menu_book' : 'science' }}</mat-icon>
                      <span>{{ type.name === 'THEORY' ? 'Teórica' : 'Práctica' }}</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-hint>Según el tipo de curso seleccionado</mat-hint>
                <mat-error *ngIf="basicForm.controls['sessionTypeUuid'].hasError('required')">
                  Debe seleccionar un tipo de sesión
                </mat-error>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="basicForm.invalid">
                Siguiente: Seleccionar Docente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 2: Selección de Docente -->
        <mat-step [stepControl]="teacherForm" label="Docente">
          <form [formGroup]="teacherForm" class="step-form">

            <div class="teacher-section">
              <h4>
                <mat-icon>person</mat-icon>
                Seleccionar Docente Competente
              </h4>
              <p class="section-description">
                Docentes filtrados por área de conocimiento: <strong>{{ getSelectedCourseKnowledgeArea() }}</strong>
              </p>

              <app-teacher-selector
                [eligibleTeachers]="eligibleTeachers"
                [selectedDay]="basicForm.value.dayOfWeek"
                [selectedTimeSlot]="null"
                [formControl]="teacherForm.get('teacherUuid')!"
                (teacherSelected)="onTeacherSelected($event)"
                (availabilityCheck)="checkTeacherAvailability($event)">
              </app-teacher-selector>

              <!-- Información del docente seleccionado -->
              <div class="teacher-info" *ngIf="selectedTeacher">
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>info</mat-icon>
                      Información del Docente
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ selectedTeacher.fullName }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="teacher-details">
                    <div class="detail-row">
                      <span class="label">Departamento:</span>
                      <span class="value">{{ selectedTeacher.department.name }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Áreas de Conocimiento:</span>
                      <div class="knowledge-areas">
                        <mat-chip
                          *ngFor="let area of selectedTeacher.knowledgeAreas"
                          [color]="area.uuid === getSelectedCourse()?.teachingKnowledgeArea.uuid ? 'primary' : 'default'">
                          {{ area.name }}
                        </mat-chip>
                      </div>
                    </div>
                    <div class="detail-row">
                      <span class="label">Disponibilidad Total:</span>
                      <span class="value">{{ selectedTeacher.totalAvailabilities }} bloques horarios</span>
                    </div>
                  </div>
                </mat-expansion-panel>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="teacherForm.invalid">
                Siguiente: Seleccionar Aula
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 3: Selección de Aula -->
        <mat-step [stepControl]="spaceForm" label="Aula">
          <form [formGroup]="spaceForm" class="step-form">

            <div class="space-section">
              <h4>
                <mat-icon>room</mat-icon>
                Seleccionar Aula Apropiada
              </h4>
              <p class="section-description">
                Aulas filtradas por tipo de sesión: <strong>{{ getSessionTypeText() }}</strong>
                <span *ngIf="getSelectedCourse()?.preferredSpecialty">
                  y especialidad: <strong>{{ getSelectedCourse()?.preferredSpecialty?.name }}</strong>
                </span>
              </p>

              <app-space-selector
                [eligibleSpaces]="eligibleSpaces"
                [requiredCapacity]="estimatedStudentCount"
                [sessionType]="basicForm.value.sessionTypeUuid"
                [formControl]="spaceForm.get('learningSpaceUuid')!"
                (spaceSelected)="onSpaceSelected($event)">
              </app-space-selector>

              <!-- Información del aula seleccionada -->
              <div class="space-info" *ngIf="selectedSpace">
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>info</mat-icon>
                      Información del Aula
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ selectedSpace.name }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="space-details">
                    <div class="detail-row">
                      <span class="label">Capacidad:</span>
                      <span class="value">{{ selectedSpace.capacity }} estudiantes</span>
                      <mat-icon
                        *ngIf="selectedSpace.capacity < estimatedStudentCount"
                        color="warn"
                        matTooltip="Capacidad insuficiente">
                        warning
                      </mat-icon>
                    </div>
                    <div class="detail-row">
                      <span class="label">Tipo:</span>
                      <mat-chip [color]="selectedSpace.teachingType.name === 'THEORY' ? 'primary' : 'warn'">
                        {{ selectedSpace.teachingType.name === 'THEORY' ? 'Teórica' : 'Práctica' }}
                      </mat-chip>
                    </div>
                    <div class="detail-row" *ngIf="selectedSpace.specialty">
                      <span class="label">Especialidad:</span>
                      <span class="value">{{ selectedSpace.specialty.name }}</span>
                    </div>
                  </div>
                </mat-expansion-panel>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="spaceForm.invalid">
                Siguiente: Programar Horario
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 4: Selección de Horario -->
        <mat-step [stepControl]="scheduleForm" label="Horario">
          <form [formGroup]="scheduleForm" class="step-form">

            <div class="schedule-section">
              <h4>
                <mat-icon>schedule</mat-icon>
                Programar Horas Pedagógicas
              </h4>
              <p class="section-description">
                Seleccione las horas pedagógicas para {{ basicForm.value.dayOfWeek ? dayLabels[basicForm.value.dayOfWeek] : 'el día seleccionado' }}
              </p>

              <app-hour-selector
                [availableHours]="availableTeachingHours"
                [selectedDay]="basicForm.value.dayOfWeek"
                [teacherUuid]="teacherForm.value.teacherUuid"
                [spaceUuid]="spaceForm.value.learningSpaceUuid"
                [groupUuid]="basicForm.value.studentGroupUuid"
                [formControl]="scheduleForm.get('teachingHourUuids')!"
                (hoursSelected)="onHoursSelected($event)"
                (validationResult)="onHourValidation($event)">
              </app-hour-selector>

              <!-- Notas adicionales -->
              <mat-form-field appearance="outline" class="full-width notes-field">
                <mat-label>Notas Adicionales</mat-label>
                <textarea
                  matInput
                  formControlName="notes"
                  rows="3"
                  placeholder="Observaciones, requisitos especiales, etc.">
                </textarea>
                <mat-hint>Información adicional sobre la sesión (opcional)</mat-hint>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="scheduleForm.invalid">
                Revisar y Confirmar
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 5: Resumen y Confirmación -->
        <mat-step label="Confirmar">
          <div class="summary-section">
            <h4>Resumen de la Sesión</h4>

            <!-- Validación final en tiempo real -->
            <div class="validation-panel" *ngIf="finalValidation">
              <div class="validation-header" [class.valid]="finalValidation.isValid" [class.invalid]="!finalValidation.isValid">
                <mat-icon>{{ finalValidation.isValid ? 'check_circle' : 'error' }}</mat-icon>
                <span>{{ finalValidation.isValid ? 'Asignación Válida' : 'Errores Detectados' }}</span>
              </div>

              <!-- Errores -->
              <div class="validation-errors" *ngIf="finalValidation.errors.length > 0">
                <div class="error-item" *ngFor="let error of finalValidation.errors">
                  <mat-icon>error</mat-icon>
                  <span>{{ error }}</span>
                </div>
              </div>

              <!-- Advertencias -->
              <div class="validation-warnings" *ngIf="finalValidation.warnings.length > 0">
                <div class="warning-item" *ngFor="let warning of finalValidation.warnings">
                  <mat-icon>warning</mat-icon>
                  <span>{{ warning }}</span>
                </div>
              </div>

              <!-- Sugerencias -->
              <div class="validation-suggestions" *ngIf="finalValidation.suggestions && finalValidation.suggestions.length > 0">
                <div class="suggestion-item" *ngFor="let suggestion of finalValidation.suggestions">
                  <mat-icon>lightbulb</mat-icon>
                  <span>{{ suggestion }}</span>
                </div>
              </div>
            </div>

            <!-- Resumen de la sesión -->
            <div class="session-summary">
              <div class="summary-card">
                <h5>Información General</h5>
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="label">Grupo:</span>
                    <span class="value">{{ getSelectedGroupName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Curso:</span>
                    <span class="value">{{ getSelectedCourseName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Docente:</span>
                    <span class="value">{{ getSelectedTeacherName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Aula:</span>
                    <span class="value">{{ getSelectedSpaceName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Día:</span>
                    <span class="value">{{ getSelectedDayName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Tipo de Sesión:</span>
                    <span class="value">{{ getSelectedSessionTypeName() }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">Horas Pedagógicas:</span>
                    <span class="value">{{ getSelectedHoursCount() }} horas ({{ getSelectedHoursRange() }})</span>
                  </div>
                  <div class="summary-item" *ngIf="scheduleForm.value.notes">
                    <span class="label">Notas:</span>
                    <span class="value">{{ scheduleForm.value.notes }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button
                mat-raised-button
                color="primary"
                [disabled]="!canSubmit()"
                (click)="onSubmit()">
                <mat-icon>{{ data.isNew ? 'add_circle' : 'save' }}</mat-icon>
                {{ data.isNew ? 'Crear Sesión' : 'Actualizar Sesión' }}
              </button>
            </div>
          </div>
        </mat-step>

      </mat-stepper>
    </div>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
    </div>
  `,
  styles: [`
    .dialog-content {
      min-width: 700px;
      max-width: 900px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .step-form {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    .group-option, .course-option, .day-option, .session-type-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;

      .group-main, .course-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .group-name, .course-code {
        font-weight: 600;
      }

      .group-period, .course-name, .course-hours, .course-area {
        font-size: 0.85rem;
        color: #666;
      }

      .day-load {
        font-size: 0.8rem;
        color: #888;
      }
    }

    .session-type-option {
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    .teacher-section, .space-section, .schedule-section {
      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px 0;
        color: #333;
      }

      .section-description {
        margin-bottom: 20px;
        color: #666;
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }

    .teacher-info, .space-info {
      margin-top: 16px;

      .teacher-details, .space-details {
        padding: 16px 0;

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          &:last-child {
            margin-bottom: 0;
          }

          .label {
            font-weight: 500;
            color: #666;
            min-width: 120px;
          }

          .value {
            color: #333;
          }

          .knowledge-areas {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
        }
      }
    }

    .notes-field {
      margin-top: 20px;
    }

    .validation-panel {
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;

      .validation-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 12px;

        &.valid {
          color: #4caf50;
        }

        &.invalid {
          color: #f44336;
        }
      }

      .validation-errors, .validation-warnings, .validation-suggestions {
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .error-item, .warning-item, .suggestion-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;

          &:last-child {
            margin-bottom: 0;
          }

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            margin-top: 1px;
          }
        }

        .error-item {
          color: #f44336;
        }

        .warning-item {
          color: #ff9800;
        }

        .suggestion-item {
          color: #2196f3;
        }
      }
    }

    .session-summary {
      .summary-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        background: #f9f9f9;

        h5 {
          margin: 0 0 16px 0;
          color: #333;
          font-weight: 600;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;

          .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #eee;

            &:last-child {
              border-bottom: none;
            }

            .label {
              font-weight: 500;
              color: #666;
            }

            .value {
              color: #333;
              text-align: right;
            }
          }
        }
      }
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .dialog-actions {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .dialog-content {
        min-width: 320px;
        max-width: 95vw;
      }

      .form-row {
        flex-direction: column;
      }

      .summary-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `]
})
export class ClassSessionDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Forms
  basicForm!: FormGroup;
  teacherForm!: FormGroup;
  spaceForm!: FormGroup;
  scheduleForm!: FormGroup;

  // Data
  studentGroups: StudentGroup[] = [];
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  eligibleTeachers: Teacher[] = [];
  eligibleSpaces: LearningSpace[] = [];
  availableTeachingHours: TeachingHour[] = [];
  availableSessionTypes: any[] = [];

  // Selected entities
  selectedTeacher: Teacher | null = null;
  selectedSpace: LearningSpace | null = null;

  // State
  finalValidation: ValidationResult | null = null;
  estimatedStudentCount = 30; // Estimación por defecto

  // Constants
  readonly daysOfWeek = [
    { value: 'MONDAY', label: 'Lunes' },
    { value: 'TUESDAY', label: 'Martes' },
    { value: 'WEDNESDAY', label: 'Miércoles' },
    { value: 'THURSDAY', label: 'Jueves' },
    { value: 'FRIDAY', label: 'Viernes' }
  ];

  readonly dayLabels: { [key: string]: string } = {
    'MONDAY': 'Lunes',
    'TUESDAY': 'Martes',
    'WEDNESDAY': 'Miércoles',
    'THURSDAY': 'Jueves',
    'FRIDAY': 'Viernes'
  };

  constructor(
    private fb: FormBuilder,
    private classAssignmentService: ClassAssignmentService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ClassSessionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupRealTimeValidation();

    if (!this.data.isNew && this.data.session) {
      this.populateFormsWithSessionData();
    } else if (this.data.prefilledData) {
      this.populateFormsWithPrefilledData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.basicForm = this.fb.group({
      studentGroupUuid: ['', [Validators.required]],
      courseUuid: ['', [Validators.required]],
      dayOfWeek: ['', [Validators.required]],
      sessionTypeUuid: ['', [Validators.required]]
    });

    this.teacherForm = this.fb.group({
      teacherUuid: ['', [Validators.required]]
    });

    this.spaceForm = this.fb.group({
      learningSpaceUuid: ['', [Validators.required]]
    });

    this.scheduleForm = this.fb.group({
      teachingHourUuids: [[], [Validators.required, Validators.minLength(1)]],
      notes: ['']
    });
  }

  private loadInitialData(): void {
    combineLatest([
      this.classAssignmentService.getAllStudentGroups(),
      this.classAssignmentService.getAllCourses(),
      this.classAssignmentService.getAllTeachingTypes()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([groupsRes, coursesRes, typesRes]) => {
          this.studentGroups = Array.isArray(groupsRes.data) ? groupsRes.data : [groupsRes.data];
          this.allCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [coursesRes.data];
          this.availableSessionTypes = Array.isArray(typesRes.data) ? typesRes.data : [typesRes.data];
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          this.snackBar.open('Error al cargar los datos iniciales', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private setupRealTimeValidation(): void {
    // Validación final cuando todos los campos estén completos
    combineLatest([
      this.basicForm.valueChanges.pipe(startWith(this.basicForm.value)),
      this.teacherForm.valueChanges.pipe(startWith(this.teacherForm.value)),
      this.spaceForm.valueChanges.pipe(startWith(this.spaceForm.value)),
      this.scheduleForm.valueChanges.pipe(startWith(this.scheduleForm.value))
    ]).pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(([basic, teacher, space, schedule]) => {
      if (this.allFormsValid() && schedule.teachingHourUuids.length > 0) {
        this.performFinalValidation();
      }
    });
  }

  private populateFormsWithSessionData(): void {
    const session = this.data.session!;

    this.basicForm.patchValue({
      studentGroupUuid: session.studentGroup.uuid,
      courseUuid: session.course.uuid,
      dayOfWeek: session.dayOfWeek,
      sessionTypeUuid: session.sessionType.uuid
    });

    this.teacherForm.patchValue({
      teacherUuid: session.teacher.uuid
    });

    this.spaceForm.patchValue({
      learningSpaceUuid: session.learningSpace.uuid
    });

    this.scheduleForm.patchValue({
      teachingHourUuids: session.teachingHours.map(hour => hour.uuid),
      notes: session.notes || ''
    });

    // Disparar eventos de cambio para cargar datos dependientes
    this.onGroupChange(session.studentGroup.uuid);
    this.onCourseChange(session.course.uuid);
    this.onTeacherSelected(session.teacher);
    this.onSpaceSelected(session.learningSpace);
  }

  private populateFormsWithPrefilledData(): void {
    const prefilled = this.data.prefilledData;

    if (prefilled) {
      this.basicForm.patchValue({
        studentGroupUuid: prefilled.group || '',
        courseUuid: prefilled.course || '',
        dayOfWeek: prefilled.dayOfWeek || '',
        sessionTypeUuid: prefilled.sessionType || ''
      });

      this.teacherForm.patchValue({
        teacherUuid: prefilled.teacher || ''
      });

      this.spaceForm.patchValue({
        learningSpaceUuid: prefilled.space || ''
      });

      // Disparar cambios si hay datos pre-seleccionados
      if (prefilled.group) {
        this.onGroupChange(prefilled.group);
      }
      if (prefilled.course) {
        this.onCourseChange(prefilled.course);
      }
    }
  }

  // === EVENT HANDLERS ===

  onGroupChange(groupUuid: string): void {
    const group = this.studentGroups.find(g => g.uuid === groupUuid);
    if (!group) return;

    // Filtrar cursos por ciclo del grupo
    this.filteredCourses = this.allCourses.filter(course =>
      course.cycle.uuid === group.cycleUuid
    );

    // Limpiar curso seleccionado si no es compatible
    const currentCourse = this.basicForm.value.courseUuid;
    if (currentCourse && !this.filteredCourses.some(c => c.uuid === currentCourse)) {
      this.basicForm.patchValue({ courseUuid: '' });
    }
  }

  onCourseChange(courseUuid: string): void {
    const course = this.allCourses.find(c => c.uuid === courseUuid);
    if (!course) return;

    // Filtrar tipos de sesión disponibles según el curso
    const courseType = this.getCourseType(course);
    this.availableSessionTypes = this.availableSessionTypes.filter(type => {
      if (courseType === 'THEORY') return type.name === 'THEORY';
      if (courseType === 'PRACTICE') return type.name === 'PRACTICE';
      if (courseType === 'MIXED') return true;
      return false;
    });

    // Auto-seleccionar tipo de sesión si solo hay uno disponible
    if (this.availableSessionTypes.length === 1) {
      this.basicForm.patchValue({ sessionTypeUuid: this.availableSessionTypes[0].uuid });
    }

    // Cargar docentes elegibles
    this.classAssignmentService.getEligibleTeachers(course)
      .pipe(takeUntil(this.destroy$))
      .subscribe(teachers => {
        this.eligibleTeachers = teachers;
      });

    // Cargar espacios elegibles
    this.classAssignmentService.getEligibleLearningSpaces(course, this.estimatedStudentCount)
      .pipe(takeUntil(this.destroy$))
      .subscribe(spaces => {
        this.eligibleSpaces = spaces;
      });
  }

  onDayChange(): void {
    this.updateAvailableHours();
  }

  onTeacherSelected(teacher: Teacher): void {
    this.selectedTeacher = teacher;
    this.updateAvailableHours();
  }

  onSpaceSelected(space: LearningSpace): void {
    this.selectedSpace = space;
    this.updateAvailableHours();
  }

  onHoursSelected(hours: TeachingHour[]): void {
    this.scheduleForm.patchValue({
      teachingHourUuids: hours.map(hour => hour.uuid)
    });
  }

  onHourValidation(result: ValidationResult): void {
    // Manejar validación específica de horas
    if (!result.isValid) {
      this.snackBar.open(result.errors[0], 'Cerrar', { duration: 3000 });
    }
  }

  checkTeacherAvailability(data: any): void {
    // Verificar disponibilidad específica del docente
    if (data.teacherUuid && data.day && data.startTime && data.endTime) {
      this.classAssignmentService.checkTeacherAvailability(
        data.teacherUuid,
        data.day,
        data.startTime,
        data.endTime
      ).pipe(takeUntil(this.destroy$))
        .subscribe(isAvailable => {
          if (!isAvailable) {
            this.snackBar.open(
              'El docente no está disponible en este horario',
              'Cerrar',
              { duration: 3000 }
            );
          }
        });
    }
  }

  private updateAvailableHours(): void {
    const basicValue = this.basicForm.value;
    const teacherValue = this.teacherForm.value;
    const spaceValue = this.spaceForm.value;

    if (basicValue.studentGroupUuid && basicValue.dayOfWeek &&
      teacherValue.teacherUuid && spaceValue.learningSpaceUuid) {

      this.classAssignmentService.getAvailableTeachingHours(
        teacherValue.teacherUuid,
        spaceValue.learningSpaceUuid,
        basicValue.studentGroupUuid,
        basicValue.dayOfWeek
      ).pipe(takeUntil(this.destroy$))
        .subscribe(hours => {
          this.availableTeachingHours = hours;
        });
    }
  }

  private performFinalValidation(): void {
    const formData = this.getFormData();

    this.classAssignmentService.validateAssignmentInRealTime(
      formData.courseUuid,
      formData.teacherUuid,
      formData.learningSpaceUuid,
      formData.studentGroupUuid,
      formData.dayOfWeek,
      formData.teachingHourUuids
    ).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.finalValidation = result;
      });
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

  getCourseTypeText(course: Course): string {
    const type = this.getCourseType(course);
    return type === 'MIXED' ? 'Mixto' : type === 'THEORY' ? 'Teórico' : 'Práctico';
  }

  getCourseTypeColor(course: Course): string {
    const type = this.getCourseType(course);
    return type === 'MIXED' ? 'accent' : type === 'THEORY' ? 'primary' : 'warn';
  }

  getDayWorkload(day: string): number {
    // Calcular cuántas sesiones ya hay programadas para este día
    // Esta es una función placeholder - deberías implementar la lógica real
    return Math.floor(Math.random() * 10);
  }

  private allFormsValid(): boolean {
    return this.basicForm.valid && this.teacherForm.valid &&
      this.spaceForm.valid && this.scheduleForm.valid;
  }

  canSubmit(): boolean {
    return this.allFormsValid() &&
      this.finalValidation?.isValid === true &&
      this.scheduleForm.value.teachingHourUuids.length > 0;
  }

  private getFormData(): any {
    return {
      studentGroupUuid: this.basicForm.value.studentGroupUuid,
      courseUuid: this.basicForm.value.courseUuid,
      teacherUuid: this.teacherForm.value.teacherUuid,
      learningSpaceUuid: this.spaceForm.value.learningSpaceUuid,
      dayOfWeek: this.basicForm.value.dayOfWeek,
      sessionTypeUuid: this.basicForm.value.sessionTypeUuid,
      teachingHourUuids: this.scheduleForm.value.teachingHourUuids,
      notes: this.scheduleForm.value.notes
    };
  }

  // === GETTERS FOR TEMPLATE ===

  getSelectedCourseKnowledgeArea(): string {
    const courseUuid = this.basicForm.value.courseUuid;
    const course = this.allCourses.find(c => c.uuid === courseUuid);
    return course?.teachingKnowledgeArea.name || '';
  }

  getSelectedCourse(): Course | null {
    const courseUuid = this.basicForm.value.courseUuid;
    return this.allCourses.find(c => c.uuid === courseUuid) || null;
  }

  getSessionTypeText(): string {
    const typeUuid = this.basicForm.value.sessionTypeUuid;
    const type = this.availableSessionTypes.find(t => t.uuid === typeUuid);
    return type?.name === 'THEORY' ? 'Teórica' : 'Práctica';
  }

  getSelectedGroupName(): string {
    const groupUuid = this.basicForm.value.studentGroupUuid;
    const group = this.studentGroups.find(g => g.uuid === groupUuid);
    return group ? `${group.name} (Ciclo ${group.cycleNumber})` : '';
  }

  getSelectedCourseName(): string {
    const course = this.getSelectedCourse();
    return course ? `${course.code} - ${course.name}` : '';
  }

  getSelectedTeacherName(): string {
    return this.selectedTeacher?.fullName || '';
  }

  getSelectedSpaceName(): string {
    return this.selectedSpace?.name || '';
  }

  getSelectedDayName(): string {
    const day = this.basicForm.value.dayOfWeek;
    return this.dayLabels[day] || '';
  }

  getSelectedSessionTypeName(): string {
    const typeUuid = this.basicForm.value.sessionTypeUuid;
    const type = this.availableSessionTypes.find(t => t.uuid === typeUuid);
    return type?.name === 'THEORY' ? 'Teórica' : 'Práctica';
  }

  getSelectedHoursCount(): number {
    return this.scheduleForm.value.teachingHourUuids?.length || 0;
  }

  getSelectedHoursRange(): string {
    const hourUuids = this.scheduleForm.value.teachingHourUuids || [];
    if (hourUuids.length === 0) return '';

    const hours = this.availableTeachingHours.filter(h => hourUuids.includes(h.uuid));
    if (hours.length === 0) return '';

    const startTimes = hours.map(h => h.startTime).sort();
    const endTimes = hours.map(h => h.endTime).sort();

    return `${startTimes[0]} - ${endTimes[endTimes.length - 1]}`;
  }

  // === ACTIONS ===

  onSubmit(): void {
    if (!this.canSubmit()) return;

    const sessionData = this.getFormData();
    this.dialogRef.close(sessionData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
