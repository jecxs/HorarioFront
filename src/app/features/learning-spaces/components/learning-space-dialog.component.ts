// src/app/features/learning-spaces/components/learning-space-dialog.component.ts
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
import { MatSliderModule } from '@angular/material/slider';

import { LearningSpace, TeachingType, LearningSpaceSpecialty } from '../services/learning-space.service';

interface DialogData {
  isNew: boolean;
  space?: LearningSpace;
  teachingTypes: TeachingType[];
  specialties: LearningSpaceSpecialty[];
}

@Component({
  selector: 'app-learning-space-dialog',
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
    MatSliderModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isNew ? 'add' : 'edit' }}</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Ambiente de Aprendizaje
    </h2>

    <div mat-dialog-content class="dialog-content">
      <form [formGroup]="spaceForm" class="space-form">
        <!-- Nombre del Ambiente -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Ambiente</mat-label>
          <input
            matInput
            formControlName="name"
            placeholder="Ej: Aula 101, Lab. Enfermería A"
            maxlength="100">
          <mat-hint>Nombre descriptivo del ambiente</mat-hint>
          <mat-error *ngIf="spaceForm.controls['name'].hasError('required')">
            El nombre es obligatorio
          </mat-error>
          <mat-error *ngIf="spaceForm.controls['name'].hasError('maxlength')">
            El nombre no puede exceder 100 caracteres
          </mat-error>
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
          <mat-error *ngIf="spaceForm.controls['typeUUID'].hasError('required')">
            Debe seleccionar un tipo de ambiente
          </mat-error>
        </mat-form-field>

        <!-- Especialidad (solo para ambientes prácticos) -->
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
                <div class="specialty-department" *ngIf="specialty.department">
                  Dpto: {{ specialty.department.name }}
                </div>
              </div>
            </mat-option>
          </mat-select>
          <mat-hint>Seleccione el tipo específico de laboratorio</mat-hint>
        </mat-form-field>

        <!-- Información sobre especialidades para ambientes prácticos -->
        <div class="specialty-info" *ngIf="isPracticalType && data.specialties.length === 0">
          <mat-icon>info</mat-icon>
          <span>
            No hay especialidades registradas.
            <strong>Puede crear una nueva especialidad desde el botón principal.</strong>
          </span>
        </div>

        <!-- Capacidad -->
        <div class="capacity-section">
          <mat-form-field appearance="outline" class="capacity-field">
            <mat-label>Capacidad de Personas</mat-label>
            <input
              matInput
              type="number"
              formControlName="capacity"
              min="1"
              max="500"
              placeholder="Ej: 30">
            <mat-icon matSuffix>people</mat-icon>
            <mat-error *ngIf="spaceForm.controls['capacity'].hasError('required')">
              La capacidad es obligatoria
            </mat-error>
            <mat-error *ngIf="spaceForm.controls['capacity'].hasError('min')">
              La capacidad debe ser mayor que 0
            </mat-error>
            <mat-error *ngIf="spaceForm.controls['capacity'].hasError('max')">
              La capacidad no puede exceder 500 personas
            </mat-error>
          </mat-form-field>

          <div class="capacity-indicator">
            <div class="capacity-range" [ngClass]="getCapacityRangeClass()">
              <mat-icon>{{ getCapacityIcon() }}</mat-icon>
              <span>{{ getCapacityRangeText() }}</span>
            </div>
          </div>
        </div>

        <!-- Vista previa del ambiente -->
        <div class="space-preview" *ngIf="spaceForm.valid">
          <h4>Vista previa:</h4>
          <div class="preview-card" [ngClass]="getSelectedTypeClass()">
            <div class="preview-header">
              <div class="preview-name">
                <h5>{{ spaceForm.value.name }}</h5>
                <mat-chip [color]="getSelectedTypeColor()">
                  <mat-icon>{{ getSelectedTypeIcon() }}</mat-icon>
                  {{ getSelectedTypeDisplayName() }}
                </mat-chip>
              </div>
              <div class="preview-capacity">
                <mat-icon>people</mat-icon>
                <span>{{ spaceForm.value.capacity }} personas</span>
              </div>
            </div>

            <div class="preview-details" *ngIf="getSelectedSpecialtyName()">
              <div class="preview-specialty">
                <mat-icon>precision_manufacturing</mat-icon>
                <span>{{ getSelectedSpecialtyName() }}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="spaceForm.invalid"
        (click)="onSubmit()">
        <mat-icon>{{ data.isNew ? 'add' : 'save' }}</mat-icon>
        {{ data.isNew ? 'Crear Ambiente' : 'Actualizar Ambiente' }}
      </button>
    </div>
  `,
  styles: [`
    .dialog-content {
      min-width: 500px;
      max-width: 700px;
    }

    .space-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
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
      display: flex;
      flex-direction: column;
      gap: 2px;

      .specialty-name {
        font-weight: 500;
      }

      .specialty-description {
        font-size: 0.8rem;
        color: #666;
      }

      .specialty-department {
        font-size: 0.75rem;
        color: #999;
        font-style: italic;
      }
    }

    .specialty-info {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff3e0;
      border: 1px solid #ffcc02;
      border-radius: 8px;
      padding: 12px;
      color: #e65100;
      font-size: 0.9rem;

      mat-icon {
        color: #ff9800;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .capacity-section {
      display: flex;
      gap: 16px;
      align-items: flex-end;

      .capacity-field {
        flex: 1;
      }

      .capacity-indicator {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        .capacity-range {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 500;

          &.small {
            background-color: #e8f5e8;
            color: #2e7d32;
          }

          &.medium {
            background-color: #e3f2fd;
            color: #1565c0;
          }

          &.large {
            background-color: #fff3e0;
            color: #e65100;
          }

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    .space-preview {
      margin-top: 24px;

      h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-weight: 500;
      }

      .preview-card {
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
        background: #f9f9f9;

        &.theory {
          border-left: 4px solid #1976d2;
        }

        &.practice {
          border-left: 4px solid #7b1fa2;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;

          .preview-name {
            h5 {
              margin: 0 0 8px 0;
              font-size: 1.1rem;
              font-weight: 500;
            }

            mat-chip {
              display: flex;
              align-items: center;
              gap: 4px;
              height: 28px;

              mat-icon {
                font-size: 14px;
                width: 14px;
                height: 14px;
              }
            }
          }

          .preview-capacity {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #666;

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }
        }

        .preview-details {
          .preview-specialty {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #666;
            font-size: 0.9rem;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              color: #7b1fa2;
            }
          }
        }
      }
    }

    .dialog-actions {
      margin-top: 24px;

      button {
        margin-left: 8px;

        &:first-child {
          margin-left: 0;
        }
      }
    }

    @media (max-width: 768px) {
      .dialog-content {
        min-width: 300px;
      }

      .capacity-section {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .capacity-indicator {
          justify-content: center;
          margin-bottom: 0;
        }
      }
    }
  `]
})
export class LearningSpaceDialogComponent implements OnInit {
  spaceForm: FormGroup;
  isPracticalType = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LearningSpaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.spaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      capacity: ['', [Validators.required, Validators.min(1), Validators.max(500)]],
      typeUUID: ['', [Validators.required]],
      specialtyUuid: ['']
    });
  }

  ngOnInit(): void {
    if (!this.data.isNew && this.data.space) {
      this.spaceForm.patchValue({
        name: this.data.space.name,
        capacity: this.data.space.capacity,
        typeUUID: this.data.space.teachingType.uuid,
        specialtyUuid: this.data.space.specialty?.uuid || ''
      });

      // Verificar si es tipo práctico
      this.isPracticalType = this.data.space.teachingType.name === 'PRACTICE';
    }
  }

  onTypeChange(typeUuid: string): void {
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    this.isPracticalType = selectedType?.name === 'PRACTICE';

    // Limpiar especialidad si no es práctico
    if (!this.isPracticalType) {
      this.spaceForm.patchValue({ specialtyUuid: '' });
    }
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

  getCapacityRangeClass(): string {
    const capacity = this.spaceForm.value.capacity;
    if (!capacity) return '';
    if (capacity <= 20) return 'small';
    if (capacity <= 40) return 'medium';
    return 'large';
  }

  getCapacityIcon(): string {
    const capacity = this.spaceForm.value.capacity;
    if (!capacity) return 'people';
    if (capacity <= 20) return 'person';
    if (capacity <= 40) return 'groups';
    return 'group_work';
  }

  getCapacityRangeText(): string {
    const capacity = this.spaceForm.value.capacity;
    if (!capacity) return '';
    if (capacity <= 20) return 'Pequeño';
    if (capacity <= 40) return 'Mediano';
    return 'Grande';
  }

  getSelectedTypeClass(): string {
    const typeUuid = this.spaceForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType?.name.toLowerCase() || '';
  }

  getSelectedTypeColor(): string {
    const typeUuid = this.spaceForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType?.name === 'THEORY' ? 'primary' : 'accent';
  }

  getSelectedTypeIcon(): string {
    const typeUuid = this.spaceForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType ? this.getTypeIcon(selectedType.name) : '';
  }

  getSelectedTypeDisplayName(): string {
    const typeUuid = this.spaceForm.value.typeUUID;
    const selectedType = this.data.teachingTypes.find(t => t.uuid === typeUuid);
    return selectedType ? this.getTypeDisplayName(selectedType.name) : '';
  }

  getSelectedSpecialtyName(): string {
    const specialtyUuid = this.spaceForm.value.specialtyUuid;
    if (!specialtyUuid) return '';
    const specialty = this.data.specialties.find(s => s.uuid === specialtyUuid);
    return specialty ? specialty.name : '';
  }

  onSubmit(): void {
    if (this.spaceForm.valid) {
      const formValue = this.spaceForm.value;
      const result = {
        name: formValue.name,
        capacity: parseInt(formValue.capacity),
        typeUUID: formValue.typeUUID,
        specialtyUuid: formValue.specialtyUuid || undefined
      };

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
