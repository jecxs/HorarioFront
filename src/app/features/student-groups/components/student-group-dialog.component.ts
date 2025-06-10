// src/app/features/student-groups/components/student-group-dialog.component.ts
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

import { StudentGroup, Career, Cycle } from '../services/student-group.service';
import { Period } from '../../periods/services/period.service';

interface DialogData {
  isNew: boolean;
  group?: StudentGroup;
  careers: Career[];
  currentPeriod: Period | null;
}

@Component({
  selector: 'app-student-group-dialog',
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
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.isNew ? 'add' : 'edit' }}</mat-icon>
      {{ data.isNew ? 'Crear' : 'Editar' }} Grupo de Estudiantes
    </h2>

    <div mat-dialog-content class="dialog-content">
      <!-- Información del periodo actual -->
      <div class="period-info" *ngIf="data.currentPeriod">
        <mat-icon>info</mat-icon>
        <span>
          El grupo será asignado al periodo:
          <strong>{{ data.currentPeriod.name }}</strong>
        </span>
      </div>

      <form [formGroup]="groupForm" class="group-form">
        <!-- Selección de Carrera -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Carrera</mat-label>
          <mat-select formControlName="careerUuid" (selectionChange)="onCareerChange($event.value)">
            <mat-option value="">Seleccionar carrera</mat-option>
            <mat-option *ngFor="let career of data.careers" [value]="career.uuid">
              <div class="career-option">
                <div class="career-name">{{ career.name }}</div>
                <div class="career-modality">{{ career.modality.name }}</div>
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="groupForm.controls['careerUuid'].hasError('required')">
            Debe seleccionar una carrera
          </mat-error>
        </mat-form-field>

        <!-- Selección de Ciclo -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ciclo</mat-label>
          <mat-select formControlName="cycleUuid" [disabled]="!selectedCareer">
            <mat-option value="">Seleccionar ciclo</mat-option>
            <mat-option *ngFor="let cycle of availableCycles" [value]="cycle.uuid">
              Ciclo {{ cycle.number }}
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="!selectedCareer">Primero seleccione una carrera</mat-hint>
          <mat-error *ngIf="groupForm.controls['cycleUuid'].hasError('required')">
            Debe seleccionar un ciclo
          </mat-error>
        </mat-form-field>

        <!-- Nombre del Grupo -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Grupo</mat-label>
          <input
            matInput
            formControlName="name"
            placeholder="Ej: A, B, C, D..."
            maxlength="10">
          <mat-hint>Use nombres cortos como A, B, C o siglas</mat-hint>
          <mat-error *ngIf="groupForm.controls['name'].hasError('required')">
            El nombre es obligatorio
          </mat-error>
          <mat-error *ngIf="groupForm.controls['name'].hasError('maxlength')">
            El nombre no puede exceder 10 caracteres
          </mat-error>
        </mat-form-field>

        <!-- Vista previa del grupo -->
        <div class="group-preview" *ngIf="groupForm.valid">
          <h4>Vista previa:</h4>
          <div class="preview-card">
            <div class="preview-info">
              <div class="group-name-preview">
                Grupo: <strong>{{ groupForm.value.name }}</strong>
              </div>
              <div class="cycle-info">
                Ciclo: <strong>{{ getSelectedCycleNumber() }}</strong>
              </div>
              <div class="career-info">
                Carrera: <strong>{{ getSelectedCareerName() }}</strong>
              </div>
              <div class="period-info-preview">
                Periodo: <strong>{{ data.currentPeriod?.name || 'No definido' }}</strong>
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
        [disabled]="groupForm.invalid"
        (click)="onSubmit()">
        <mat-icon>{{ data.isNew ? 'add' : 'save' }}</mat-icon>
        {{ data.isNew ? 'Crear Grupo' : 'Actualizar Grupo' }}
      </button>
    </div>
  `,
  styles: [`
    .dialog-content {
      min-width: 400px;
      max-width: 600px;
    }

    .period-info {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 24px;
      color: #1565c0;
      font-size: 0.9rem;

      mat-icon {
        color: #1976d2;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .group-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .career-option {
      display: flex;
      flex-direction: column;

      .career-name {
        font-weight: 500;
      }

      .career-modality {
        font-size: 0.8rem;
        color: #666;
      }
    }

    .group-preview {
      margin-top: 24px;

      h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-weight: 500;
      }

      .preview-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        background: #f9f9f9;

        .preview-info {
          display: flex;
          flex-direction: column;
          gap: 8px;

          > div {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #eee;

            &:last-child {
              border-bottom: none;
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
    }
  `]
})
export class StudentGroupDialogComponent implements OnInit {
  groupForm: FormGroup;
  selectedCareer: Career | null = null;
  availableCycles: Cycle[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StudentGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(10)]],
      careerUuid: ['', [Validators.required]],
      cycleUuid: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (!this.data.isNew && this.data.group) {
      // Encontrar la carrera del grupo basándose en el ciclo
      const career = this.data.careers.find(c =>
        c.cycles.some(cycle => cycle.uuid === this.data.group!.cycleUuid)
      );

      if (career) {
        this.selectedCareer = career;
        this.availableCycles = career.cycles;

        this.groupForm.patchValue({
          name: this.data.group.name,
          careerUuid: career.uuid,
          cycleUuid: this.data.group.cycleUuid
        });
      }
    }
  }

  onCareerChange(careerUuid: string): void {
    this.selectedCareer = this.data.careers.find(c => c.uuid === careerUuid) || null;
    this.availableCycles = this.selectedCareer ? this.selectedCareer.cycles : [];

    // Limpiar selección de ciclo cuando cambia la carrera
    this.groupForm.patchValue({ cycleUuid: '' });
  }

  getSelectedCycleNumber(): number | null {
    const cycleUuid = this.groupForm.value.cycleUuid;
    const cycle = this.availableCycles.find(c => c.uuid === cycleUuid);
    return cycle ? cycle.number : null;
  }

  getSelectedCareerName(): string {
    return this.selectedCareer ? this.selectedCareer.name : '';
  }

  onSubmit(): void {
    if (this.groupForm.valid && this.data.currentPeriod) {
      const formValue = this.groupForm.value;
      const result = {
        name: formValue.name,
        cycleUuid: formValue.cycleUuid,
        periodUuid: this.data.currentPeriod.uuid
      };

      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
