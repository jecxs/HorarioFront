// src/app/features/learning-spaces/components/specialty-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { LearningSpaceService, LearningSpaceSpecialty, AcademicDepartment } from '../services/learning-space.service';

interface DialogData {
  isNew: boolean;
  specialty?: LearningSpaceSpecialty;
}

@Component({
  selector: 'app-specialty-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>add_business</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Especialidad de Laboratorio
    </h2>

    <div mat-dialog-content class="dialog-content">
      <div class="info-section">
        <mat-icon>info</mat-icon>
        <span>
          Las especialidades definen el tipo específico de laboratorio (ej: Enfermería, Cómputo, Química)
        </span>
      </div>

      <form [formGroup]="specialtyForm" class="specialty-form">
        <!-- Nombre de la Especialidad -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de la Especialidad</mat-label>
          <input
            matInput
            formControlName="name"
            placeholder="Ej: Laboratorio de Enfermería, Laboratorio de Cómputo"
            maxlength="100">
          <mat-hint>Nombre descriptivo del tipo de laboratorio</mat-hint>
          <mat-error *ngIf="specialtyForm.controls['name'].hasError('required')">
            El nombre es obligatorio
          </mat-error>
          <mat-error *ngIf="specialtyForm.controls['name'].hasError('maxlength')">
            El nombre no puede exceder 100 caracteres
          </mat-error>
        </mat-form-field>

        <!-- Descripción -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción (opcional)</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Descripción detallada de la especialidad y su equipamiento"
            maxlength="255"
            rows="3">
          </textarea>
          <mat-hint>Descripción opcional del equipamiento o características especiales</mat-hint>
          <mat-error *ngIf="specialtyForm.controls['description'].hasError('maxlength')">
            La descripción no puede exceder 255 caracteres
          </mat-error>
        </mat-form-field>

        <!-- Departamento Académico -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Departamento Académico (opcional)</mat-label>
          <mat-select formControlName="departmentUuid">
            <mat-option value="">Sin departamento específico</mat-option>
            <mat-option *ngFor="let department of departments" [value]="department.uuid">
              <div class="department-option">
                <div class="department-name">{{ department.name }}</div>
                <div class="department-code" *ngIf="department.code">
                  Código: {{ department.code }}
                </div>
              </div>
            </mat-option>
          </mat-select>
          <mat-hint>Departamento al que pertenece esta especialidad</mat-hint>
        </mat-form-field>

        <!-- Vista previa -->
        <div class="specialty-preview" *ngIf="specialtyForm.value.name">
          <h4>Vista previa:</h4>
          <div class="preview-card">
            <div class="preview-header">
              <mat-icon>precision_manufacturing</mat-icon>
              <h5>{{ specialtyForm.value.name }}</h5>
            </div>

            <div class="preview-description" *ngIf="specialtyForm.value.description">
              <p>{{ specialtyForm.value.description }}</p>
            </div>

            <div class="preview-department" *ngIf="getSelectedDepartmentName()">
              <mat-icon>business</mat-icon>
              <span>Departamento: {{ getSelectedDepartmentName() }}</span>
            </div>
          </div>
        </div>
      </form>
    </div>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button
        mat-raised-button
        color="accent"
        [disabled]="specialtyForm.invalid"
        (click)="onSubmit()">
        <mat-icon>{{ data.isNew ? 'add' : 'save' }}</mat-icon>
        {{ data.isNew ? 'Crear Especialidad' : 'Actualizar Especialidad' }}
      </button>
    </div>
  `,
  styles: [`
    .dialog-content {
      min-width: 450px;
      max-width: 600px;
    }

    .info-section {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #e8f5e8;
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 24px;
      color: #2e7d32;
      font-size: 0.9rem;

      mat-icon {
        color: #4caf50;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .specialty-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .department-option {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .department-name {
        font-weight: 500;
      }

      .department-code {
        font-size: 0.8rem;
        color: #666;
      }
    }

    .specialty-preview {
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
        background: #f3e5f5;
        border-left: 4px solid #7b1fa2;

        .preview-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;

          mat-icon {
            color: #7b1fa2;
            font-size: 24px;
            width: 24px;
            height: 24px;
          }

          h5 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 500;
            color: #333;
          }
        }

        .preview-description {
          margin-bottom: 12px;

          p {
            margin: 0;
            color: #666;
            font-size: 0.9rem;
            line-height: 1.4;
            font-style: italic;
          }
        }

        .preview-department {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 0.9rem;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #999;
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
    }
  `]
})
export class SpecialtyDialogComponent implements OnInit {
  specialtyForm: FormGroup;
  departments: AcademicDepartment[] = [];

  constructor(
    private fb: FormBuilder,
    private learningSpaceService: LearningSpaceService,
    public dialogRef: MatDialogRef<SpecialtyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.specialtyForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(255)]],
      departmentUuid: ['']
    });
  }

  ngOnInit(): void {
    this.loadDepartments();

    if (!this.data.isNew && this.data.specialty) {
      this.specialtyForm.patchValue({
        name: this.data.specialty.name,
        description: this.data.specialty.description || '',
        departmentUuid: this.data.specialty.department?.uuid || ''
      });
    }
  }

  loadDepartments(): void {
    this.learningSpaceService.getAllDepartments().subscribe({
      next: (response) => {
        this.departments = Array.isArray(response.data) ? response.data : [response.data];
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        // Continuar sin departamentos si hay error
        this.departments = [];
      }
    });
  }

  getSelectedDepartmentName(): string {
    const departmentUuid = this.specialtyForm.value.departmentUuid;
    if (!departmentUuid) return '';
    const department = this.departments.find(d => d.uuid === departmentUuid);
    return department ? department.name : '';
  }

  onSubmit(): void {
    if (this.specialtyForm.valid) {
      const formValue = this.specialtyForm.value;
      const result = {
        name: formValue.name,
        description: formValue.description || undefined,
        departmentUuid: formValue.departmentUuid || undefined
      };

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
