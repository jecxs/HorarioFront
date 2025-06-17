// src/app/features/courses/components/course-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil, debounceTime, switchMap, startWith, combineLatest } from 'rxjs';

import {
  CourseService,
  Course,
  TeachingType,
  KnowledgeArea,
  LearningSpaceSpecialty,
  EducationalModality,
  Career,
  Cycle
} from '../services/course.service';

interface DialogData {
  isNew: boolean;
  course?: Course;
}

@Component({
  selector: 'app-course-dialog',
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
    MatSliderModule,
    MatStepperModule,
    MatCheckboxModule,
    MatProgressBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isNew ? 'add' : 'edit' }}</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Curso
    </h2>

    <div mat-dialog-content class="dialog-content">
      <mat-stepper [linear]="true" #stepper>

        <!-- Paso 1: Información Básica -->
        <mat-step [stepControl]="basicInfoForm" label="Información Básica">
          <form [formGroup]="basicInfoForm" class="step-form">

            <!-- Nombre del Curso -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre del Curso</mat-label>
              <input
                matInput
                formControlName="name"
                placeholder="Ej: Programación Orientada a Objetos"
                maxlength="150">
              <mat-hint>Nombre descriptivo y completo del curso</mat-hint>
              <mat-error *ngIf="basicInfoForm.controls['name'].hasError('required')">
                El nombre es obligatorio
              </mat-error>
              <mat-error *ngIf="basicInfoForm.controls['name'].hasError('maxlength')">
                El nombre no puede exceder 150 caracteres
              </mat-error>
            </mat-form-field>

            <!-- Código del Curso -->
            <div class="code-section">
              <mat-form-field appearance="outline" class="code-field">
                <mat-label>Código del Curso</mat-label>
                <input
                  matInput
                  formControlName="code"
                  placeholder="Ej: POO-101, MAT-001"
                  maxlength="50"
                  (input)="onCodeInput($event)">
                <mat-icon matSuffix>qr_code</mat-icon>
                <mat-hint>Código único identificador del curso</mat-hint>
                <mat-error *ngIf="basicInfoForm.controls['code'].hasError('required')">
                  El código es obligatorio
                </mat-error>
                <mat-error *ngIf="basicInfoForm.controls['code'].hasError('maxlength')">
                  El código no puede exceder 50 caracteres
                </mat-error>
                <mat-error *ngIf="basicInfoForm.controls['code'].hasError('codeExists')">
                  Este código ya existe, elija otro
                </mat-error>
              </mat-form-field>

              <div class="code-status" *ngIf="basicInfoForm.value.code">
                <mat-progress-bar
                  *ngIf="checkingCode"
                  mode="indeterminate"
                  class="code-progress">
                </mat-progress-bar>
                <div
                  *ngIf="!checkingCode && !basicInfoForm.controls['code'].hasError('codeExists')"
                  class="code-available">
                  <mat-icon>check_circle</mat-icon>
                  <span>Código disponible</span>
                </div>
              </div>
            </div>

            <!-- Navegación jerárquica -->
            <div class="hierarchy-section">
              <h4>Ubicación en la Malla Curricular</h4>

              <!-- Modalidad Educativa -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Modalidad Educativa</mat-label>
                <mat-select formControlName="modalityUuid" (selectionChange)="onModalityChange($event.value)">
                  <mat-option value="">Seleccionar modalidad</mat-option>
                  <mat-option *ngFor="let modality of modalities" [value]="modality.uuid">
                    <div class="modality-option">
                      <div class="modality-name">{{ modality.name }}</div>
                      <div class="modality-duration">{{ modality.durationYears }} años</div>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="basicInfoForm.controls['modalityUuid'].hasError('required')">
                  Debe seleccionar una modalidad educativa
                </mat-error>
              </mat-form-field>

              <!-- Carrera -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Carrera</mat-label>
                <mat-select
                  formControlName="careerUuid"
                  (selectionChange)="onCareerChange($event.value)"
                  [disabled]="!basicInfoForm.value.modalityUuid">
                  <mat-option value="">Seleccionar carrera</mat-option>
                  <mat-option *ngFor="let career of filteredCareers" [value]="career.uuid">
                    {{ career.name }}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="basicInfoForm.controls['careerUuid'].hasError('required')">
                  Debe seleccionar una carrera
                </mat-error>
              </mat-form-field>

              <!-- Ciclo -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Ciclo</mat-label>
                <mat-select
                  formControlName="cycleUuid"
                  [disabled]="!basicInfoForm.value.careerUuid">
                  <mat-option value="">Seleccionar ciclo</mat-option>
                  <mat-option *ngFor="let cycle of filteredCycles" [value]="cycle.uuid">
                    <div class="cycle-option">
                      <span class="cycle-number">Ciclo {{ cycle.number }}</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="basicInfoForm.controls['cycleUuid'].hasError('required')">
                  Debe seleccionar un ciclo
                </mat-error>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="basicInfoForm.invalid">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 2: Configuración Académica -->
        <mat-step [stepControl]="academicForm" label="Configuración Académica">
          <form [formGroup]="academicForm" class="step-form">

            <!-- Área de Conocimiento -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Área de Conocimiento</mat-label>
              <mat-select formControlName="knowledgeAreaUuid">
                <mat-option value="">Seleccionar área de conocimiento</mat-option>
                <mat-option *ngFor="let area of knowledgeAreas" [value]="area.uuid">
                  <div class="knowledge-area-option">
                    <div class="area-name">{{ area.name }}</div>
                    <div class="area-department">Departamento: {{ area.department.name }}</div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint>Define qué tipo de docente puede dictar este curso</mat-hint>
              <mat-error *ngIf="academicForm.controls['knowledgeAreaUuid'].hasError('required')">
                Debe seleccionar un área de conocimiento
              </mat-error>
            </mat-form-field>

            <!-- Configuración de Horas -->
            <div class="hours-section">
              <h4>Distribución de Horas Semanales</h4>

              <div class="hours-grid">
                <!-- Horas Teóricas -->
                <div class="hour-config theory">
                  <mat-form-field appearance="outline">
                    <mat-label>Horas Teóricas</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="weeklyTheoryHours"
                      min="0"
                      max="20"
                      (input)="onHoursChange()">
                    <mat-icon matSuffix>menu_book</mat-icon>
                    <mat-error *ngIf="academicForm.controls['weeklyTheoryHours'].hasError('min')">
                      No puede ser negativo
                    </mat-error>
                    <mat-error *ngIf="academicForm.controls['weeklyTheoryHours'].hasError('max')">
                      Máximo 20 horas
                    </mat-error>
                  </mat-form-field>
                  <div class="hour-description">
                    <mat-icon>info</mat-icon>
                    <span>Clases magistrales, exposiciones</span>
                  </div>
                </div>

                <!-- Horas Prácticas -->
                <div class="hour-config practice">
                  <mat-form-field appearance="outline">
                    <mat-label>Horas Prácticas</mat-label>
                    <input
                      matInput
                      type="number"
                      formControlName="weeklyPracticeHours"
                      min="0"
                      max="20"
                      (input)="onHoursChange()">
                    <mat-icon matSuffix>science</mat-icon>
                    <mat-error *ngIf="academicForm.controls['weeklyPracticeHours'].hasError('min')">
                      No puede ser negativo
                    </mat-error>
                    <mat-error *ngIf="academicForm.controls['weeklyPracticeHours'].hasError('max')">
                      Máximo 20 horas
                    </mat-error>
                  </mat-form-field>
                  <div class="hour-description">
                    <mat-icon>info</mat-icon>
                    <span>Laboratorios, talleres, simulaciones</span>
                  </div>
                </div>
              </div>

              <!-- Resumen de Horas -->
              <div class="hours-summary" *ngIf="getTotalHours() > 0">
                <div class="summary-item total">
                  <mat-icon>schedule</mat-icon>
                  <span>Total: {{ getTotalHours() }} horas semanales</span>
                </div>
                <div class="summary-item type">
                  <mat-icon>{{ getCourseTypeIcon() }}</mat-icon>
                  <span>Tipo: {{ getCourseTypeText() }}</span>
                </div>
              </div>

              <!-- Error si no hay horas -->
              <div class="hours-error" *ngIf="academicForm.hasError('noHours')">
                <mat-icon>error</mat-icon>
                <span>Debe asignar al menos 1 hora semanal (teórica o práctica)</span>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="academicForm.invalid">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 3: Configuración de Laboratorio -->
        <mat-step [stepControl]="specialtyForm" label="Configuración de Laboratorio" [optional]="!requiresSpecialty()">
          <form [formGroup]="specialtyForm" class="step-form">

            <div *ngIf="requiresSpecialty()" class="specialty-required">
              <div class="info-section">
                <mat-icon>science</mat-icon>
                <div>
                  <h4>Especialidad de Laboratorio Requerida</h4>
                  <p>Este curso incluye horas prácticas, por lo que necesita especificar el tipo de laboratorio.</p>
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Especialidad de Laboratorio</mat-label>
                <mat-select formControlName="preferredSpecialtyUuid">
                  <mat-option value="">Sin especialidad específica</mat-option>
                  <mat-option *ngFor="let specialty of specialties" [value]="specialty.uuid">
                    <div class="specialty-option">
                      <div class="specialty-name">{{ specialty.name }}</div>
                      <div class="specialty-description" *ngIf="specialty.description">
                        {{ specialty.description }}
                      </div>
                      <div class="specialty-department" *ngIf="specialty.department">
                        Departamento: {{ specialty.department.name }}
                      </div>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-hint>Tipo específico de laboratorio necesario para las prácticas</mat-hint>
              </mat-form-field>
            </div>

            <div *ngIf="!requiresSpecialty()" class="specialty-not-needed">
              <div class="info-section theory">
                <mat-icon>menu_book</mat-icon>
                <div>
                  <h4>No se requiere especialidad</h4>
                  <p>Este curso es completamente teórico, por lo que no necesita configuración de laboratorio.</p>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext>
                Finalizar
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 4: Resumen -->
        <mat-step label="Resumen">
          <div class="summary-section">
            <h4>Resumen del Curso</h4>

            <div class="course-preview">
              <div class="preview-header">
                <h5>{{ basicInfoForm.value.name }}</h5>
                <mat-chip [color]="getCourseTypeColor()">
                  <mat-icon>{{ getCourseTypeIcon() }}</mat-icon>
                  {{ getCourseTypeText() }}
                </mat-chip>
              </div>

              <div class="preview-details">
                <div class="detail-row">
                  <span class="label">Código:</span>
                  <span class="value">{{ basicInfoForm.value.code }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Modalidad:</span>
                  <span class="value">{{ getSelectedModalityName() }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Carrera:</span>
                  <span class="value">{{ getSelectedCareerName() }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Ciclo:</span>
                  <span class="value">Ciclo {{ getSelectedCycleNumber() }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Área de Conocimiento:</span>
                  <span class="value">{{ getSelectedKnowledgeAreaName() }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Horas Semanales:</span>
                  <span class="value">
                    {{ academicForm.value.weeklyTheoryHours }}h teóricas +
                    {{ academicForm.value.weeklyPracticeHours }}h prácticas =
                    {{ getTotalHours() }}h total
                  </span>
                </div>
                <div class="detail-row" *ngIf="specialtyForm.value.preferredSpecialtyUuid">
                  <span class="label">Especialidad:</span>
                  <span class="value">{{ getSelectedSpecialtyName() }}</span>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button
                mat-raised-button
                color="primary"
                (click)="onSubmit()"
                [disabled]="!canSubmit()">
                <mat-icon>{{ data.isNew ? 'add' : 'save' }}</mat-icon>
                {{ data.isNew ? 'Crear Curso' : 'Actualizar Curso' }}
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
      min-width: 600px;
      max-width: 800px;
      max-height: 80vh;
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

    .code-section {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .code-field {
        flex: 1;
      }

      .code-status {
        .code-progress {
          height: 2px;
        }

        .code-available {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4caf50;
          font-size: 0.9rem;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .hierarchy-section {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #f9f9f9;

      h4 {
        margin: 0 0 16px 0;
        color: #333;
        font-weight: 500;
      }
    }

    .modality-option, .knowledge-area-option, .specialty-option {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .modality-name, .area-name, .specialty-name {
        font-weight: 500;
      }

      .modality-duration, .area-department, .specialty-description, .specialty-department {
        font-size: 0.8rem;
        color: #666;
      }
    }

    .cycle-option {
      display: flex;
      align-items: center;
      gap: 8px;

      .cycle-number {
        font-weight: 500;
      }
    }

    .hours-section {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #f9f9f9;

      h4 {
        margin: 0 0 16px 0;
        color: #333;
        font-weight: 500;
      }

      .hours-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;

        .hour-config {
          display: flex;
          flex-direction: column;
          gap: 8px;

          &.theory {
            .hour-description {
              color: #1976d2;
            }
          }

          &.practice {
            .hour-description {
              color: #7b1fa2;
            }
          }

          .hour-description {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;

            mat-icon {
              font-size: 14px;
              width: 14px;
              height: 14px;
            }
          }
        }
      }

      .hours-summary {
        display: flex;
        gap: 16px;
        padding: 12px;
        background: #e8f5e8;
        border-radius: 8px;
        border: 1px solid #4caf50;

        .summary-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;

          &.total {
            color: #2e7d32;
          }

          &.type {
            color: #1565c0;
          }

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .hours-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #ffebee;
        border: 1px solid #f44336;
        border-radius: 8px;
        color: #c62828;
        font-size: 0.9rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .specialty-required, .specialty-not-needed {
      .info-section {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;

        &:not(.theory) {
          background: #f3e5f5;
          border: 1px solid #7b1fa2;
          color: #4a148c;
        }

        &.theory {
          background: #e3f2fd;
          border: 1px solid #1976d2;
          color: #0d47a1;
        }

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          margin-top: 4px;
        }

        h4 {
          margin: 0 0 4px 0;
          font-weight: 500;
        }

        p {
          margin: 0;
          font-size: 0.9rem;
        }
      }
    }

    .summary-section {
      padding: 20px 0;

      h4 {
        margin: 0 0 20px 0;
        color: #333;
        font-weight: 500;
      }

      .course-preview {
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        background: #f9f9f9;

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;

          h5 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 500;
            color: #333;
          }

          mat-chip {
            display: flex;
            align-items: center;
            gap: 4px;

            mat-icon {
              font-size: 14px;
              width: 14px;
              height: 14px;
            }
          }
        }

        .preview-details {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px solid #eee;

            &:last-child {
              border-bottom: none;
            }

            .label {
              font-weight: 500;
              color: #666;
              min-width: 140px;
            }

            .value {
              color: #333;
              text-align: right;
              flex: 1;
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

      .hours-grid {
        grid-template-columns: 1fr !important;
      }

      .hours-summary {
        flex-direction: column !important;
        gap: 8px !important;
      }

      .preview-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px;
      }
    }
  `]
})
export class CourseDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Forms
  basicInfoForm!: FormGroup;
  academicForm!: FormGroup;
  specialtyForm!: FormGroup;
  // Data
  modalities: any[] = [];
  careers: any[] = [];
  cycles: any[] = [];
  knowledgeAreas: any[] = [];
  specialties: any[] = [];
  teachingTypes: any[] = [];

  // Filtered data
  filteredCareers: any[] = [];
  filteredCycles: any[] = [];

  // State
  checkingCode = false;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    public dialogRef: MatDialogRef<CourseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormValidation();

    if (!this.data.isNew && this.data.course) {
      this.populateFormsWithCourseData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Form básico
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      code: ['', [Validators.required, Validators.maxLength(50)], [this.codeExistsValidator.bind(this)]],
      modalityUuid: ['', [Validators.required]],
      careerUuid: ['', [Validators.required]],
      cycleUuid: ['', [Validators.required]]
    });

    // Form académico
    this.academicForm = this.fb.group({
      knowledgeAreaUuid: ['', [Validators.required]],
      weeklyTheoryHours: [0, [Validators.min(0), Validators.max(20)]],
      weeklyPracticeHours: [0, [Validators.min(0), Validators.max(20)]]
    }, { validators: [this.atLeastOneHourValidator] });

    // Form especialidad
    this.specialtyForm = this.fb.group({
      preferredSpecialtyUuid: ['']
    });
  }

  private setupFormValidation(): void {
    // Validación en tiempo real del código
    this.basicInfoForm.get('code')?.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkingCode = false;
      });
  }

  private loadInitialData(): void {
    combineLatest([
      this.courseService.getAllModalities(),
      this.courseService.getAllCareers(),
      this.courseService.getAllKnowledgeAreas(),
      this.courseService.getAllSpecialties(),
      this.courseService.getAllTeachingTypes()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([modalitiesRes, careersRes, areasRes, specialtiesRes, typesRes]) => {
          this.modalities = Array.isArray(modalitiesRes.data) ? modalitiesRes.data : [modalitiesRes.data];
          this.careers = Array.isArray(careersRes.data) ? careersRes.data : [careersRes.data];
          this.knowledgeAreas = Array.isArray(areasRes.data) ? areasRes.data : [areasRes.data];
          this.specialties = Array.isArray(specialtiesRes.data) ? specialtiesRes.data : [specialtiesRes.data];
          this.teachingTypes = Array.isArray(typesRes.data) ? typesRes.data : [typesRes.data];
        },
        error: (error) => {
          console.error('Error al cargar datos iniciales:', error);
        }
      });
  }

  private populateFormsWithCourseData(): void {
    const course = this.data.course!;

    // Popular form básico
    this.basicInfoForm.patchValue({
      name: course.name,
      code: course.code,
      modalityUuid: course.modality.uuid,
      careerUuid: course.career.uuid,
      cycleUuid: course.cycle.uuid
    });

    // Popular form académico
    this.academicForm.patchValue({
      knowledgeAreaUuid: course.teachingKnowledgeArea.uuid,
      weeklyTheoryHours: course.weeklyTheoryHours,
      weeklyPracticeHours: course.weeklyPracticeHours
    });

    // Popular form especialidad
    this.specialtyForm.patchValue({
      preferredSpecialtyUuid: course.preferredSpecialty?.uuid || ''
    });

    // Actualizar carreras y ciclos filtrados
    this.onModalityChange(course.modality.uuid);
    this.onCareerChange(course.career.uuid);
  }

  // Validadores personalizados
  private codeExistsValidator(control: AbstractControl) {
    if (!control.value) {
      return null;
    }

    this.checkingCode = true;

    return this.courseService.validateCourseCode(
      control.value,
      this.data.isNew ? undefined : this.data.course?.uuid
    ).pipe(
      takeUntil(this.destroy$)
    ).pipe(
      switchMap(isValid => {
        this.checkingCode = false;
        return Promise.resolve(isValid ? null : { codeExists: true });
      })
    );
  }

  private atLeastOneHourValidator(group: AbstractControl) {
    const theoryHours = group.get('weeklyTheoryHours')?.value || 0;
    const practiceHours = group.get('weeklyPracticeHours')?.value || 0;

    return (theoryHours + practiceHours) > 0 ? null : { noHours: true };
  }

  // Event handlers
  onCodeInput(event: any): void {
    // Convertir a mayúsculas y formatear código
    const value = event.target.value.toUpperCase();
    this.basicInfoForm.patchValue({ code: value }, { emitEvent: false });
  }

  onModalityChange(modalityUuid: string): void {
    // Filtrar carreras por modalidad
    this.filteredCareers = this.careers.filter(career =>
      career.modality.uuid === modalityUuid
    );

    // Limpiar selecciones dependientes
    this.basicInfoForm.patchValue({
      careerUuid: '',
      cycleUuid: ''
    });
    this.filteredCycles = [];
  }

  onCareerChange(careerUuid: string): void {
    // Encontrar la carrera seleccionada y obtener sus ciclos
    const selectedCareer = this.careers.find(career => career.uuid === careerUuid);

    if (selectedCareer && selectedCareer.cycles) {
      this.filteredCycles = selectedCareer.cycles.sort((a: any, b: any) => a.number - b.number);
    } else {
      this.filteredCycles = [];
    }

    // Limpiar ciclo seleccionado
    this.basicInfoForm.patchValue({ cycleUuid: '' });
  }

  onHoursChange(): void {
    // Forzar revalidación del formulario cuando cambien las horas
    this.academicForm.updateValueAndValidity();
  }

  // Utility methods
  getTotalHours(): number {
    const theoryHours = this.academicForm.value.weeklyTheoryHours || 0;
    const practiceHours = this.academicForm.value.weeklyPracticeHours || 0;
    return theoryHours + practiceHours;
  }

  getCourseTypeText(): string {
    const theoryHours = this.academicForm.value.weeklyTheoryHours || 0;
    const practiceHours = this.academicForm.value.weeklyPracticeHours || 0;

    if (theoryHours > 0 && practiceHours > 0) return 'Mixto';
    if (theoryHours > 0) return 'Teórico';
    if (practiceHours > 0) return 'Práctico';
    return 'Sin definir';
  }

  getCourseTypeIcon(): string {
    const theoryHours = this.academicForm.value.weeklyTheoryHours || 0;
    const practiceHours = this.academicForm.value.weeklyPracticeHours || 0;

    if (theoryHours > 0 && practiceHours > 0) return 'hub';
    if (theoryHours > 0) return 'menu_book';
    if (practiceHours > 0) return 'science';
    return 'help';
  }

  getCourseTypeColor(): string {
    const theoryHours = this.academicForm.value.weeklyTheoryHours || 0;
    const practiceHours = this.academicForm.value.weeklyPracticeHours || 0;

    if (theoryHours > 0 && practiceHours > 0) return 'accent';
    if (theoryHours > 0) return 'primary';
    if (practiceHours > 0) return 'warn';
    return '';
  }

  requiresSpecialty(): boolean {
    return (this.academicForm.value.weeklyPracticeHours || 0) > 0;
  }

  // Getter methods for display
  getSelectedModalityName(): string {
    const uuid = this.basicInfoForm.value.modalityUuid;
    const modality = this.modalities.find(m => m.uuid === uuid);
    return modality ? modality.name : '';
  }

  getSelectedCareerName(): string {
    const uuid = this.basicInfoForm.value.careerUuid;
    const career = this.careers.find(c => c.uuid === uuid);
    return career ? career.name : '';
  }

  getSelectedCycleNumber(): number {
    const uuid = this.basicInfoForm.value.cycleUuid;
    const cycle = this.filteredCycles.find(c => c.uuid === uuid);
    return cycle ? cycle.number : 0;
  }

  getSelectedKnowledgeAreaName(): string {
    const uuid = this.academicForm.value.knowledgeAreaUuid;
    const area = this.knowledgeAreas.find(a => a.uuid === uuid);
    return area ? area.name : '';
  }

  getSelectedSpecialtyName(): string {
    const uuid = this.specialtyForm.value.preferredSpecialtyUuid;
    const specialty = this.specialties.find(s => s.uuid === uuid);
    return specialty ? specialty.name : '';
  }

  canSubmit(): boolean {
    return this.basicInfoForm.valid &&
      this.academicForm.valid &&
      this.specialtyForm.valid &&
      !this.checkingCode;
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;

    // Obtener los tipos de enseñanza requeridos
    const theoryHours = this.academicForm.value.weeklyTheoryHours || 0;
    const practiceHours = this.academicForm.value.weeklyPracticeHours || 0;

    const teachingTypeUuids = this.courseService.getRequiredTeachingTypes(
      theoryHours,
      practiceHours,
      this.teachingTypes
    );

    const courseData = {
      name: this.basicInfoForm.value.name,
      code: this.basicInfoForm.value.code,
      cycleUuid: this.basicInfoForm.value.cycleUuid,
      knowledgeAreaUuid: this.academicForm.value.knowledgeAreaUuid,
      weeklyTheoryHours: theoryHours,
      weeklyPracticeHours: practiceHours,
      preferredSpecialtyUuid: this.specialtyForm.value.preferredSpecialtyUuid || undefined,
      teachingTypeUuids
    };

    this.dialogRef.close(courseData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
