// src/app/features/time-slots/components/time-slot-dialog.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { TimeSlot, TimeSlotService, TimeSlotValidation, TeachingHour } from '../services/time-slot.service';

interface DialogData {
  isNew: boolean;
  timeSlot?: TimeSlot;
  existingTimeSlots: TimeSlot[];
}

@Component({
  selector: 'app-time-slot-dialog',
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
    MatStepperModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    MatSliderModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isNew ? 'add_alarm' : 'edit_alarm' }}</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Turno de Clases
    </h2>

    <div mat-dialog-content class="dialog-content">
      <mat-stepper #stepper [linear]="true" orientation="vertical">

        <!-- Paso 1: Información Básica del Turno -->
        <mat-step [stepControl]="basicInfoForm" label="Información del Turno">
          <form [formGroup]="basicInfoForm" class="step-form">
            <div class="basic-info-section">
              <h3>Configuración Básica</h3>

              <!-- Nombre del turno -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre del Turno</mat-label>
                <input
                  matInput
                  formControlName="name"
                  placeholder="Ej: M1, TARDE, NOCHE"
                  maxlength="10">
                <mat-hint>Nombre corto y descriptivo (máx. 10 caracteres)</mat-hint>
                <mat-error *ngIf="basicInfoForm.controls['name'].hasError('required')">
                  El nombre es obligatorio
                </mat-error>
              </mat-form-field>

              <!-- Horario del turno -->
              <div class="time-range-section">
                <h4>Rango Horario del Turno</h4>
                <div class="time-inputs">
                  <mat-form-field appearance="outline">
                    <mat-label>Hora de Inicio</mat-label>
                    <input
                      matInput
                      type="time"
                      formControlName="startTime"
                      (change)="onTimeChange()">
                    <mat-icon matSuffix>schedule</mat-icon>
                  </mat-form-field>

                  <mat-icon class="time-separator">arrow_forward</mat-icon>

                  <mat-form-field appearance="outline">
                    <mat-label>Hora de Fin</mat-label>
                    <input
                      matInput
                      type="time"
                      formControlName="endTime"
                      (change)="onTimeChange()">
                    <mat-icon matSuffix>schedule</mat-icon>
                  </mat-form-field>
                </div>

                <!-- Información de duración -->
                <div class="duration-info" *ngIf="calculatedDuration > 0">
                  <mat-icon>timelapse</mat-icon>
                  <span>Duración total: <strong>{{ formatDuration(calculatedDuration) }}</strong></span>
                </div>
              </div>

              <!-- Verificación de solapamientos -->
              <div class="overlap-warning" *ngIf="hasOverlap">
                <mat-icon>warning</mat-icon>
                <span>¡ATENCIÓN! Este turno se solapa con otros turnos existentes</span>
              </div>
            </div>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="basicInfoForm.invalid || hasOverlap">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 2: Configuración de Horas Pedagógicas -->
        <mat-step [stepControl]="pedagogicalForm" label="Horas Pedagógicas">
          <form [formGroup]="pedagogicalForm" class="step-form">
            <div class="pedagogical-section">
              <h3>Configuración de Horas Pedagógicas</h3>

              <div class="duration-explanation">
                <mat-icon>info</mat-icon>
                <div class="explanation-text">
                  <p><strong>¿Qué son las horas pedagógicas?</strong></p>
                  <p>Son los bloques mínimos de tiempo en que se divide una clase.
                     Deben encajar <strong>exactamente</strong> dentro del turno sin dejar tiempo libre.</p>
                </div>
              </div>

              <!-- Selector de duración -->
              <div class="duration-selector">
                <h4>Duración de cada Hora Pedagógica</h4>

                <!-- Opciones comunes -->
                <div class="common-durations">
                  <button
                    type="button"
                    mat-stroked-button
                    *ngFor="let duration of commonDurations"
                    [color]="pedagogicalForm.value.pedagogicalHourDurationInMinutes === duration ? 'primary' : ''"
                    (click)="selectDuration(duration)"
                    [disabled]="!isDurationValid(duration)">
                    {{ duration }} min
                    <mat-icon *ngIf="isDurationValid(duration)">check_circle</mat-icon>
                    <mat-icon *ngIf="!isDurationValid(duration)">cancel</mat-icon>
                  </button>
                </div>

                <!-- Duración personalizada -->
                <mat-form-field appearance="outline" class="custom-duration">
                  <mat-label>Duración personalizada (minutos)</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="pedagogicalHourDurationInMinutes"
                    min="15"
                    max="180"
                    (input)="onDurationChange()">
                  <mat-hint>Entre 15 y 180 minutos</mat-hint>
                </mat-form-field>
              </div>

              <!-- Resultados de la validación -->
              <div class="validation-results" *ngIf="validation">
                <!-- Errores -->
                <div class="validation-errors" *ngIf="validation.errors.length > 0">
                  <h4><mat-icon>error</mat-icon> Problemas Detectados:</h4>
                  <ul>
                    <li *ngFor="let error of validation.errors">{{ error }}</li>
                  </ul>

                  <!-- Sugerencias -->
                  <div class="suggestions" *ngIf="validation.suggestedDurations && validation.suggestedDurations.length > 0">
                    <p><strong>Duraciones que sí funcionan:</strong></p>
                    <div class="suggested-buttons">
                      <button
                        type="button"
                        mat-raised-button
                        color="accent"
                        *ngFor="let duration of validation.suggestedDurations"
                        (click)="selectDuration(duration)">
                        {{ duration }} min
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Advertencias -->
                <div class="validation-warnings" *ngIf="validation.warnings.length > 0">
                  <h4><mat-icon>warning</mat-icon> Advertencias:</h4>
                  <ul>
                    <li *ngFor="let warning of validation.warnings">{{ warning }}</li>
                  </ul>
                </div>

                <!-- Información exitosa -->
                <div class="validation-success" *ngIf="validation.isValid">
                  <h4><mat-icon>check_circle</mat-icon> Configuración Válida</h4>
                  <div class="success-details">
                    <div class="detail-item">
                      <span class="label">Horas pedagógicas:</span>
                      <span class="value">{{ validation.calculatedHours }} bloques</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Duración total:</span>
                      <span class="value">{{ formatDuration(validation.totalDuration) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Sin tiempo perdido:</span>
                      <span class="value">✓ Encaje perfecto</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="!validation?.isValid">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 3: Vista Previa y Confirmación -->
        <mat-step label="Vista Previa">
          <div class="preview-section">
            <h3>Vista Previa del Turno</h3>

            <!-- Resumen del turno -->
            <mat-card class="summary-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>schedule</mat-icon>
                  {{ basicInfoForm.value.name }}
                </mat-card-title>
                <mat-card-subtitle>
                  {{ basicInfoForm.value.startTime }} - {{ basicInfoForm.value.endTime }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="summary-info">
                  <div class="info-item">
                    <mat-icon>access_time</mat-icon>
                    <span>{{ formatDuration(calculatedDuration) }} total</span>
                  </div>
                  <div class="info-item">
                    <mat-icon>view_module</mat-icon>
                    <span>{{ previewHours.length }} horas pedagógicas</span>
                  </div>
                  <div class="info-item">
                    <mat-icon>timer</mat-icon>
                    <span>{{ pedagogicalForm.value.pedagogicalHourDurationInMinutes }} min cada una</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Distribución de horas pedagógicas -->
            <mat-card class="hours-preview-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>view_list</mat-icon>
                  Distribución de Horas Pedagógicas
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list class="hours-list">
                  <mat-list-item *ngFor="let hour of previewHours; let i = index">
                    <mat-icon matListItemIcon [style.color]="getHourColor(i)">
                      looks_{{ i + 1 }}
                    </mat-icon>
                    <div matListItemTitle>
                      Hora {{ hour.orderInTimeSlot }}
                    </div>
                    <div matListItemLine>
                      {{ hour.startTime }} - {{ hour.endTime }}
                      ({{ hour.durationMinutes }} min)
                    </div>
                  </mat-list-item>
                </mat-list>
              </mat-card-content>
            </mat-card>

            <!-- Timeline visual -->
            <div class="timeline-visual" *ngIf="previewHours.length > 0">
              <h4>Línea de Tiempo Visual</h4>
              <div class="timeline">
                <div
                  class="time-block"
                  *ngFor="let hour of previewHours; let i = index"
                  [style.background-color]="getHourColor(i)"
                  [title]="'Hora ' + hour.orderInTimeSlot + ': ' + hour.startTime + ' - ' + hour.endTime">
                  {{ hour.orderInTimeSlot }}
                </div>
              </div>
              <div class="timeline-labels">
                <span class="start-label">{{ basicInfoForm.value.startTime }}</span>
                <span class="end-label">{{ basicInfoForm.value.endTime }}</span>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Anterior</button>
            <button
              mat-raised-button
              color="primary"
              (click)="onConfirm()"
              [disabled]="!isFormValid()">
              <mat-icon>{{ data.isNew ? 'add' : 'save' }}</mat-icon>
              {{ data.isNew ? 'Crear Turno' : 'Actualizar Turno' }}
            </button>
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
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .time-range-section {
      margin: 24px 0;

      h4 {
        margin: 0 0 16px 0;
        color: #333;
      }

      .time-inputs {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;

        mat-form-field {
          flex: 1;
        }

        .time-separator {
          color: #666;
          font-size: 24px;
        }
      }

      .duration-info {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #e8f5e8;
        border-radius: 8px;
        padding: 12px;
        color: #2e7d32;

        mat-icon {
          color: #4caf50;
        }
      }
    }

    .overlap-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      border: 1px solid #f44336;
      border-radius: 8px;
      padding: 12px;
      color: #c62828;
      margin-top: 16px;

      mat-icon {
        color: #f44336;
      }
    }

    .duration-explanation {
      display: flex;
      gap: 12px;
      background: #e3f2fd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;

      mat-icon {
        color: #1976d2;
        margin-top: 4px;
      }

      .explanation-text {
        p {
          margin: 0 0 8px 0;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .duration-selector {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 16px 0;
      }

      .common-durations {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;

        button {
          display: flex;
          align-items: center;
          gap: 4px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .custom-duration {
        width: 200px;
      }
    }

    .validation-results {
      margin-top: 24px;

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
        font-size: 1rem;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }

      .validation-errors {
        background: #ffebee;
        border: 1px solid #f44336;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;

        h4 {
          color: #c62828;

          mat-icon {
            color: #f44336;
          }
        }

        .suggestions {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f8bbd9;

          .suggested-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
          }
        }
      }

      .validation-warnings {
        background: #fff3e0;
        border: 1px solid #ff9800;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;

        h4 {
          color: #e65100;

          mat-icon {
            color: #ff9800;
          }
        }
      }

      .validation-success {
        background: #e8f5e8;
        border: 1px solid #4caf50;
        border-radius: 8px;
        padding: 16px;

        h4 {
          color: #2e7d32;

          mat-icon {
            color: #4caf50;
          }
        }

        .success-details {
          margin-top: 12px;

          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;

            .label {
              color: #666;
            }

            .value {
              font-weight: 500;
              color: #2e7d32;
            }
          }
        }
      }
    }

    .summary-card, .hours-preview-card {
      margin-bottom: 16px;

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .summary-info {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;

          mat-icon {
            color: #1976d2;
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    .hours-list {
      max-height: 300px;
      overflow-y: auto;

      mat-list-item {
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }
      }
    }

    .timeline-visual {
      margin-top: 24px;

      h4 {
        margin: 0 0 16px 0;
      }

      .timeline {
        display: flex;
        gap: 2px;
        background: #f5f5f5;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;

        .time-block {
          flex: 1;
          height: 40px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: transform 0.2s;

          &:hover {
            transform: scale(1.05);
          }
        }
      }

      .timeline-labels {
        display: flex;
        justify-content: space-between;
        color: #666;
        font-size: 0.8rem;

        .start-label, .end-label {
          font-weight: 500;
        }
      }
    }

    .step-actions {
      margin-top: 24px;
      display: flex;
      gap: 8px;
    }

    .dialog-actions {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .dialog-content {
        min-width: 350px;
      }

      .time-inputs {
        flex-direction: column;
        gap: 12px;

        .time-separator {
          transform: rotate(90deg);
        }
      }

      .common-durations {
        justify-content: center;
      }

      .summary-info {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class TimeSlotDialogComponent implements OnInit, OnDestroy {
  basicInfoForm: FormGroup;
  pedagogicalForm: FormGroup;

  validation: TimeSlotValidation | null = null;
  previewHours: TeachingHour[] = [];
  calculatedDuration = 0;
  hasOverlap = false;

  commonDurations = [30, 40, 45, 50, 60, 90];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private timeSlotService: TimeSlotService,
    public dialogRef: MatDialogRef<TimeSlotDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(10)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]]
    });

    this.pedagogicalForm = this.fb.group({
      pedagogicalHourDurationInMinutes: [45, [Validators.required, Validators.min(15), Validators.max(180)]]
    });
  }

  ngOnInit(): void {
    if (!this.data.isNew && this.data.timeSlot) {
      this.basicInfoForm.patchValue({
        name: this.data.timeSlot.name,
        startTime: this.data.timeSlot.startTime,
        endTime: this.data.timeSlot.endTime
      });

      if (this.data.timeSlot.teachingHours.length > 0) {
        this.pedagogicalForm.patchValue({
          pedagogicalHourDurationInMinutes: this.data.timeSlot.teachingHours[0].durationMinutes
        });
      }

      this.onTimeChange();
      this.onDurationChange();
    }

    // Configurar validación en tiempo real
    this.basicInfoForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.onTimeChange();
      });

    this.pedagogicalForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.onDurationChange();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTimeChange(): void {
    const { startTime, endTime } = this.basicInfoForm.value;

    if (startTime && endTime) {
      this.calculatedDuration = this.timeSlotService.calculateDurationInMinutes(startTime, endTime);
      this.checkOverlap();
      this.validateAndPreview();
    }
  }

  onDurationChange(): void {
    this.validateAndPreview();
  }

  checkOverlap(): void {
    if (this.basicInfoForm.valid) {
      const timeSlotData = {
        ...this.basicInfoForm.value,
        pedagogicalHourDurationInMinutes: this.pedagogicalForm.value.pedagogicalHourDurationInMinutes
      };

      const excludeId = this.data.isNew ? undefined : this.data.timeSlot?.uuid;
      this.hasOverlap = this.timeSlotService.checkTimeSlotOverlap(
        timeSlotData,
        this.data.existingTimeSlots,
        excludeId
      );
    }
  }

  validateAndPreview(): void {
    if (this.basicInfoForm.valid && this.pedagogicalForm.valid) {
      const timeSlotData = {
        ...this.basicInfoForm.value,
        ...this.pedagogicalForm.value
      };

      this.validation = this.timeSlotService.validateTimeSlot(timeSlotData);

      if (this.validation.isValid) {
        this.previewHours = this.timeSlotService.generateTeachingHoursPreview(timeSlotData);
      } else {
        this.previewHours = [];
      }
    }
  }

  selectDuration(duration: number): void {
    this.pedagogicalForm.patchValue({
      pedagogicalHourDurationInMinutes: duration
    });
  }

  isDurationValid(duration: number): boolean {
    if (this.calculatedDuration <= 0) return false;
    return this.calculatedDuration % duration === 0;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  getHourColor(index: number): string {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
      '#c62828', '#00796b', '#5d4037', '#455a64'
    ];
    return colors[index % colors.length];
  }

  isFormValid(): boolean {
    return this.basicInfoForm.valid &&
      this.pedagogicalForm.valid &&
      this.validation?.isValid === true &&
      !this.hasOverlap;
  }

  onConfirm(): void {
    if (this.isFormValid()) {
      const result = {
        ...this.basicInfoForm.value,
        ...this.pedagogicalForm.value
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
