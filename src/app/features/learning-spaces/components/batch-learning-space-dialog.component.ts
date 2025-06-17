// src/app/features/learning-spaces/components/batch-learning-space-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

import { TeachingType, LearningSpaceSpecialty } from '../services/learning-space.service';

interface DialogData {
  teachingTypes: TeachingType[];
  specialties: LearningSpaceSpecialty[];
}

interface BatchSpaceData {
  prefix: string;
  startNumber: number;
  endNumber: number;
  capacity: number;
  typeUUID: string;
  specialtyUuid?: string;
}

interface PreviewSpace {
  name: string;
  capacity: number;
  typeName: string;
  specialtyName?: string;
}

@Component({
  selector: 'app-batch-learning-space-dialog',
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
    MatCardModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>playlist_add</mat-icon>
      Crear Ambientes por Lotes
    </h2>

    <div mat-dialog-content class="dialog-content">
      <mat-stepper #stepper [linear]="true" orientation="vertical">
        <!-- Paso 1: Configuración del Patrón -->
        <mat-step [stepControl]="patternForm" label="Configurar Patrón de Nombres">
          <form [formGroup]="patternForm" class="step-form">
            <div class="pattern-section">
              <h3>Patrón de Nomenclatura</h3>

              <div class="pattern-row">
                <mat-form-field appearance="outline" class="prefix-field">
                  <mat-label>Prefijo</mat-label>
                  <input
                    matInput
                    formControlName="prefix"
                    placeholder="Ej: B, LAB, AULA"
                    (input)="updatePreview()">
                  <mat-hint>Texto que antecede al número</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="number-field">
                  <mat-label>Número inicial</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="startNumber"
                    placeholder="101"
                    (input)="updatePreview()">
                </mat-form-field>

                <mat-form-field appearance="outline" class="number-field">
                  <mat-label>Número final</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="endNumber"
                    placeholder="110"
                    (input)="updatePreview()">
                </mat-form-field>
              </div>

              <!-- Vista previa del patrón -->
              <div class="pattern-preview" *ngIf="patternForm.valid">
                <h4>Vista previa de nombres:</h4>
                <div class="preview-names">
                  <mat-chip
                    *ngFor="let name of getPreviewNames(); let i = index"
                    [class.truncated]="i >= 5"
                    color="primary">
                    {{ name }}
                  </mat-chip>
                  <span *ngIf="getTotalSpaces() > 5" class="more-indicator">
                    +{{ getTotalSpaces() - 5 }} más...
                  </span>
                </div>
                <div class="total-count">
                  <mat-icon>info</mat-icon>
                  <span>Se crearán <strong>{{ getTotalSpaces() }}</strong> ambientes</span>
                </div>
              </div>

              <div class="validation-errors" *ngIf="patternForm.invalid && patternForm.touched">
                <mat-icon>error</mat-icon>
                <span *ngIf="patternForm.hasError('invalidRange')">
                  El número final debe ser mayor que el inicial
                </span>
                <span *ngIf="patternForm.hasError('tooManySpaces')">
                  No se pueden crear más de 50 ambientes por lote
                </span>
              </div>
            </div>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext [disabled]="patternForm.invalid">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 2: Configuración de Propiedades -->
        <mat-step [stepControl]="propertiesForm" label="Configurar Propiedades">
          <form [formGroup]="propertiesForm" class="step-form">
            <div class="properties-section">
              <h3>Propiedades Comunes</h3>

              <!-- Capacidad -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Capacidad por Ambiente</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="capacity"
                  min="1"
                  max="500"
                  placeholder="30">
                <mat-icon matSuffix>people</mat-icon>
                <mat-hint>Capacidad que tendrán todos los ambientes</mat-hint>
              </mat-form-field>

              <!-- Tipo de Enseñanza -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tipo de Ambiente</mat-label>
                <mat-select formControlName="typeUUID" (selectionChange)="onTypeChange($event.value)">
                  <mat-option value="">Seleccionar tipo</mat-option>
                  <mat-option *ngFor="let type of data.teachingTypes" [value]="type.uuid">
                    <div class="type-option">
                      <mat-icon>{{ getTypeIcon(type.name) }}</mat-icon>
                      <div class="type-info">
                        <div class="type-name">{{ getTypeDisplayName(type.name) }}</div>
                        <div class="type-description">{{ getTypeDescription(type.name) }}</div>
                      </div>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Especialidad (solo para laboratorios) -->
              <mat-form-field
                *ngIf="isPracticalType"
                appearance="outline"
                class="full-width">
                <mat-label>Especialidad del Laboratorio</mat-label>
                <mat-select formControlName="specialtyUuid">
                  <mat-option value="">Sin especialidad específica</mat-option>
                  <mat-option *ngFor="let specialty of data.specialties" [value]="specialty.uuid">
                    <div class="specialty-option">
                      <div class="specialty-name">{{ specialty.name }}</div>
                      <div class="specialty-description" *ngIf="specialty.description">
                        {{ specialty.description }}
                      </div>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-hint>Todos los laboratorios tendrán esta especialidad</mat-hint>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Anterior</button>
              <button mat-raised-button color="primary" matStepperNext [disabled]="propertiesForm.invalid">
                Siguiente
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Paso 3: Resumen y Confirmación -->
        <mat-step label="Resumen y Confirmación">
          <div class="summary-section">
            <h3>Resumen de Creación por Lotes</h3>

            <!-- Información del lote -->
            <mat-card class="summary-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>info</mat-icon>
                  Información del Lote
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="summary-info">
                  <div class="info-row">
                    <span class="label">Patrón:</span>
                    <span class="value">{{ getPatternDescription() }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Cantidad:</span>
                    <span class="value">{{ getTotalSpaces() }} ambientes</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Tipo:</span>
                    <span class="value">{{ getSelectedTypeDisplayName() }}</span>
                  </div>
                  <div class="info-row" *ngIf="getSelectedSpecialtyName()">
                    <span class="label">Especialidad:</span>
                    <span class="value">{{ getSelectedSpecialtyName() }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Capacidad:</span>
                    <span class="value">{{ propertiesForm.value.capacity }} personas c/u</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Capacidad Total:</span>
                    <span class="value">{{ getTotalCapacity() }} personas</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Lista de ambientes a crear -->
            <mat-card class="preview-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>preview</mat-icon>
                  Ambientes a Crear
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list class="spaces-list">
                  <mat-list-item *ngFor="let space of getFullPreview(); let i = index">
                    <mat-icon matListItemIcon [style.color]="getTypeColor()">
                      {{ getSelectedTypeIcon() }}
                    </mat-icon>
                    <div matListItemTitle>{{ space.name }}</div>
                    <div matListItemLine>
                      {{ space.typeName }} - {{ space.capacity }} personas
                      <span *ngIf="space.specialtyName"> - {{ space.specialtyName }}</span>
                    </div>
                  </mat-list-item>
                </mat-list>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Anterior</button>
            <button
              mat-raised-button
              color="primary"
              (click)="onConfirm()"
              [disabled]="!isFormValid()">
              <mat-icon>add_circle</mat-icon>
              Crear {{ getTotalSpaces() }} Ambientes
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
      min-width: 600px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .step-form {
      padding: 16px 0;
    }

    .pattern-section {
      .pattern-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .pattern-preview {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;

        h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 1rem;
        }

        .preview-names {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;

          .truncated {
            display: none;
          }

          .more-indicator {
            color: #666;
            font-style: italic;
            align-self: center;
          }
        }

        .total-count {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1976d2;
          font-weight: 500;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .validation-errors {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d32f2f;
        background: #ffebee;
        border-radius: 4px;
        padding: 8px 12px;
        margin-top: 8px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .properties-section {
      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .type-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #666;
        }

        .type-info {
          .type-name {
            font-weight: 500;
          }

          .type-description {
            font-size: 0.8rem;
            color: #666;
          }
        }
      }

      .specialty-option {
        .specialty-name {
          font-weight: 500;
        }

        .specialty-description {
          font-size: 0.8rem;
          color: #666;
        }
      }
    }

    .summary-section {
      .summary-card, .preview-card {
        margin-bottom: 16px;

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;

          mat-icon {
            color: #1976d2;
          }
        }

        .summary-info {
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;

            &:last-child {
              border-bottom: none;
              font-weight: 500;
              color: #1976d2;
            }

            .label {
              color: #666;
            }

            .value {
              font-weight: 500;
            }
          }
        }

        .spaces-list {
          max-height: 200px;
          overflow-y: auto;

          mat-list-item {
            border-bottom: 1px solid #f0f0f0;

            &:last-child {
              border-bottom: none;
            }
          }
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
    }
  `]
})
export class BatchLearningSpaceDialogComponent implements OnInit {
  patternForm: FormGroup;
  propertiesForm: FormGroup;
  isPracticalType = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<BatchLearningSpaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.patternForm = this.fb.group({
      prefix: ['', [Validators.required]],
      startNumber: ['', [Validators.required, Validators.min(1)]],
      endNumber: ['', [Validators.required, Validators.min(1)]]
    }, { validators: this.rangeValidator });

    this.propertiesForm = this.fb.group({
      capacity: ['', [Validators.required, Validators.min(1), Validators.max(500)]],
      typeUUID: ['', [Validators.required]],
      specialtyUuid: ['']
    });
  }

  ngOnInit(): void {
    // Configurar valores por defecto
    this.patternForm.patchValue({
      prefix: 'B',
      startNumber: 101,
      endNumber: 110
    });

    this.propertiesForm.patchValue({
      capacity: 30
    });
  }

  rangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const start = group.get('startNumber')?.value;
    const end = group.get('endNumber')?.value;

    if (start && end) {
      if (end <= start) {
        return { 'invalidRange': true };
      }
      if ((end - start + 1) > 50) {
        return { 'tooManySpaces': true };
      }
    }

    return null;
  }

  onTypeChange(typeUuid: string): void {
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    this.isPracticalType = selectedType?.name === 'PRACTICE';

    if (!this.isPracticalType) {
      this.propertiesForm.patchValue({ specialtyUuid: '' });
    }
  }

  updatePreview(): void {
    // Trigger change detection for preview
  }

  getPreviewNames(): string[] {
    if (!this.patternForm.valid) return [];

    const { prefix, startNumber, endNumber } = this.patternForm.value;
    const names: string[] = [];

    for (let i = startNumber; i <= endNumber && names.length < 5; i++) {
      names.push(`${prefix}${i}`);
    }

    return names;
  }

  getTotalSpaces(): number {
    if (!this.patternForm.valid) return 0;

    const { startNumber, endNumber } = this.patternForm.value;
    return endNumber - startNumber + 1;
  }

  getTotalCapacity(): number {
    if (!this.propertiesForm.valid || !this.patternForm.valid) return 0;

    return this.getTotalSpaces() * this.propertiesForm.value.capacity;
  }

  getPatternDescription(): string {
    if (!this.patternForm.valid) return '';

    const { prefix, startNumber, endNumber } = this.patternForm.value;
    return `${prefix}${startNumber} hasta ${prefix}${endNumber}`;
  }

  getFullPreview(): PreviewSpace[] {
    if (!this.isFormValid()) return [];

    const { prefix, startNumber, endNumber } = this.patternForm.value;
    const { capacity, typeUUID, specialtyUuid } = this.propertiesForm.value;

    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUUID);
    const selectedSpecialty = this.data.specialties.find(s => s.uuid === specialtyUuid);

    const spaces: PreviewSpace[] = [];

    for (let i = startNumber; i <= endNumber; i++) {
      spaces.push({
        name: `${prefix}${i}`,
        capacity: capacity,
        typeName: this.getTypeDisplayName(selectedType?.name || ''),
        specialtyName: selectedSpecialty?.name
      });
    }

    return spaces;
  }

  getTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  getTypeDisplayName(typeName: string): string {
    return typeName === 'THEORY' ? 'Aula Teórica' : 'Laboratorio';
  }

  getTypeDescription(typeName: string): string {
    return typeName === 'THEORY'
      ? 'Para clases magistrales y actividades teóricas'
      : 'Para prácticas, experimentos y actividades técnicas';
  }

  getSelectedTypeDisplayName(): string {
    const typeUuid = this.propertiesForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType ? this.getTypeDisplayName(selectedType.name) : '';
  }

  getSelectedTypeIcon(): string {
    const typeUuid = this.propertiesForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType ? this.getTypeIcon(selectedType.name) : '';
  }

  getSelectedSpecialtyName(): string {
    const specialtyUuid = this.propertiesForm.value.specialtyUuid;
    if (!specialtyUuid) return '';
    const specialty = this.data.specialties.find(s => s.uuid === specialtyUuid);
    return specialty ? specialty.name : '';
  }

  getTypeColor(): string {
    const typeUuid = this.propertiesForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType?.name === 'THEORY' ? '#1976d2' : '#7b1fa2';
  }

  isFormValid(): boolean {
    return this.patternForm.valid && this.propertiesForm.valid;
  }

  onConfirm(): void {
    if (this.isFormValid()) {
      const batchData: BatchSpaceData = {
        ...this.patternForm.value,
        ...this.propertiesForm.value
      };

      this.dialogRef.close(batchData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
