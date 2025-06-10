// src/app/features/periods/period-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Period } from '../services/period.service';

@Component({
  selector: 'app-period-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.isNew ? 'Crear' : 'Editar' }} Periodo Académico</h2>
    <div mat-dialog-content>
      <form [formGroup]="periodForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Periodo</mat-label>
          <input matInput formControlName="name" placeholder="Ej: 2025-I">
          <mat-error *ngIf="periodForm.controls['name'].hasError('required')">
            El nombre es obligatorio
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha de Inicio</mat-label>
          <input matInput [matDatepicker]="startPicker" formControlName="startDate">
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
          <mat-error *ngIf="periodForm.controls['startDate'].hasError('required')">
            La fecha de inicio es obligatoria
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha de Fin</mat-label>
          <input matInput [matDatepicker]="endPicker" formControlName="endDate">
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
          <mat-error *ngIf="periodForm.controls['endDate'].hasError('required')">
            La fecha de fin es obligatoria
          </mat-error>
          <mat-error *ngIf="periodForm.hasError('dateOrder')">
            La fecha de fin debe ser posterior a la fecha de inicio
          </mat-error>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="periodForm.invalid"
        (click)="onSubmit()">
        {{ data.isNew ? 'Crear' : 'Actualizar' }}
      </button>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
  `]
})
export class PeriodDialogComponent implements OnInit {
  periodForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isNew: boolean; period?: Period }
  ) {
    this.periodForm = this.fb.group({
      name: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]]
    }, { validators: this.dateOrderValidator });
  }

  ngOnInit(): void {
    if (!this.data.isNew && this.data.period) {
      this.periodForm.patchValue({
        name: this.data.period.name,
        startDate: new Date(this.data.period.startDate),
        endDate: new Date(this.data.period.endDate)
      });
    }
  }

  dateOrderValidator(group: FormGroup): { [key: string]: boolean } | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;

    if (start && end && new Date(start) >= new Date(end)) {
      return { 'dateOrder': true };
    }

    return null;
  }

  onSubmit(): void {
    if (this.periodForm.valid) {
      this.dialogRef.close(this.periodForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
