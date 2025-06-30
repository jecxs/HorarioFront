// src/app/features/docentes/components/disponibilidad/disponibilidad-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { finalize } from 'rxjs/operators';

import { DisponibilidadService } from '../../services/disponibilidad.service';
import { TeacherAvailabilityResponse, TeacherAvailabilityRequest, DayOfWeek } from '../../models/disponibilidad.model';

interface DialogData {
  teacherUuid: string;
  teacherName: string;
  preselectedDay?: DayOfWeek;
  editingAvailability?: TeacherAvailabilityResponse;
  existingAvailabilities?: TeacherAvailabilityResponse[];

}

interface TimeConflict {
  availability: TeacherAvailabilityResponse;
  type: 'overlap' | 'adjacent';
}

@Component({
  selector: 'app-disponibilidad-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatCheckboxModule
  ],
  template: `
    <div class="disponibilidad-form-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>{{ isEditing ? 'edit' : 'add' }}</mat-icon>
        {{ isEditing ? 'Editar' : 'Agregar' }} Disponibilidad
        <span class="teacher-name">{{ data.teacherName }}</span>
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="availabilityForm" class="availability-form">
          <!-- Día de la semana -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Día de la semana</mat-label>
            <mat-select formControlName="dayOfWeek" [disabled]="isEditing">
              <mat-option *ngFor="let day of daysOfWeek" [value]="day.value">
                {{ day.label }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="availabilityForm.get('dayOfWeek')?.hasError('required')">
              El día de la semana es obligatorio
            </mat-error>
          </mat-form-field>

          <!-- Horarios -->
          <div class="time-row">
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Hora de inicio</mat-label>
              <input
                matInput
                type="time"
                formControlName="startTime"
                (blur)="onTimeChange()"
                min="06:00"
                max="22:00">
              <mat-error *ngIf="availabilityForm.get('startTime')?.hasError('required')">
                La hora de inicio es obligatoria
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Hora de fin</mat-label>
              <input
                matInput
                type="time"
                formControlName="endTime"
                (blur)="onTimeChange()"
                min="06:00"
                max="22:00">
              <mat-error *ngIf="availabilityForm.get('endTime')?.hasError('required')">
                La hora de fin es obligatoria
              </mat-error>
              <mat-error *ngIf="availabilityForm.get('endTime')?.hasError('invalidTimeRange')">
                La hora de fin debe ser posterior a la hora de inicio
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Duración calculada -->
          <div *ngIf="calculatedDuration > 0" class="duration-info">
            <mat-icon>schedule</mat-icon>
            <span>Duración: {{ calculatedDuration }} horas</span>
          </div>

          <!-- Conflictos detectados -->
          <div *ngIf="timeConflicts.length > 0" class="conflicts-section">
            <div class="conflicts-header">
              <mat-icon color="warn">warning</mat-icon>
              <span>Conflictos detectados</span>
            </div>

            <mat-chip-set class="conflicts-list">
              <mat-chip
                *ngFor="let conflict of timeConflicts"
                [color]="conflict.type === 'overlap' ? 'warn' : 'accent'"
                [class.overlap-chip]="conflict.type === 'overlap'"
                [class.adjacent-chip]="conflict.type === 'adjacent'">
                <mat-icon>{{ conflict.type === 'overlap' ? 'error' : 'info' }}</mat-icon>
                {{ conflict.availability.startTime.slice(0,5) }} - {{ conflict.availability.endTime.slice(0,5) }}
                ({{ conflict.type === 'overlap' ? 'Solapamiento' : 'Adyacente' }})
              </mat-chip>
            </mat-chip-set>

            <div *ngIf="hasOverlapConflicts" class="conflict-options">
              <mat-checkbox
                formControlName="replaceOverlapping"
                color="warn">
                Reemplazar horarios en conflicto
              </mat-checkbox>
              <p class="conflict-warning">
                <mat-icon>info</mat-icon>
                Al activar esta opción, se eliminarán los horarios que se solapan con el nuevo.
              </p>
            </div>
          </div>

          <!-- Horarios sugeridos -->

        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button
          mat-button
          type="button"
          (click)="onCancel()"
          [disabled]="loading">
          Cancelar
        </button>

        <button
          mat-raised-button
          color="primary"
          type="button"
          (click)="onSave()"
          [disabled]="loading || !availabilityForm.valid || (hasOverlapConflicts && !availabilityForm.get('replaceOverlapping')?.value)">

          <mat-spinner
            *ngIf="loading"
            diameter="16"
            class="button-spinner">
          </mat-spinner>

          <mat-icon *ngIf="!loading">{{ isEditing ? 'save' : 'add' }}</mat-icon>
          {{ isEditing ? 'Guardar cambios' : 'Agregar disponibilidad' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./disponibilidad-form.component.scss']
})
export class DisponibilidadFormComponent implements OnInit {
  availabilityForm!: FormGroup;
  loading = false;
  timeConflicts: TimeConflict[] = [];
  calculatedDuration = 0;
  suggestedTimes: { startTime: string; endTime: string; duration: number }[] = [];

  readonly daysOfWeek = [
    { value: 'MONDAY' as DayOfWeek, label: 'Lunes' },
    { value: 'TUESDAY' as DayOfWeek, label: 'Martes' },
    { value: 'WEDNESDAY' as DayOfWeek, label: 'Miércoles' },
    { value: 'THURSDAY' as DayOfWeek, label: 'Jueves' },
    { value: 'FRIDAY' as DayOfWeek, label: 'Viernes' },
    { value: 'SATURDAY' as DayOfWeek, label: 'Sábado' },
    { value: 'SUNDAY' as DayOfWeek, label: 'Domingo' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DisponibilidadFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private disponibilidadService: DisponibilidadService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();

    if (!this.isEditing) {
      this.generateSuggestions();
    }
  }

  get isEditing(): boolean {
    return !!this.data.editingAvailability;
  }

  get hasOverlapConflicts(): boolean {
    return this.timeConflicts.some(conflict => conflict.type === 'overlap');
  }

  private initializeForm(): void {
    const editingData = this.data.editingAvailability;

    this.availabilityForm = this.fb.group({
      dayOfWeek: [
        editingData?.dayOfWeek || this.data.preselectedDay || 'MONDAY',
        [Validators.required]
      ],
      startTime: [
        editingData?.startTime?.slice(0, 5) || '',
        [Validators.required]
      ],
      endTime: [
        editingData?.endTime?.slice(0, 5) || '',
        [Validators.required]
      ],
      replaceOverlapping: [false]
    });

    // CORREGIDO: Agregar validador personalizado con el tipo correcto
    this.availabilityForm.setValidators([this.timeRangeValidator()]);
  }

  private setupFormSubscriptions(): void {
    // Detectar cambios en día, hora inicio o fin para recalcular conflictos
    this.availabilityForm.valueChanges.subscribe(() => {
      this.onTimeChange();
    });
  }

  onTimeChange(): void {
    const { dayOfWeek, startTime, endTime } = this.availabilityForm.value;

    if (startTime && endTime) {
      this.calculateDuration();
      this.detectConflicts();
    }

    // Actualizar validez del formulario
    this.availabilityForm.updateValueAndValidity({ emitEvent: false });
  }

  private calculateDuration(): void {
    const { startTime, endTime } = this.availabilityForm.value;

    if (!startTime || !endTime) {
      this.calculatedDuration = 0;
      return;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes > startMinutes) {
      this.calculatedDuration = Math.round((endMinutes - startMinutes) / 60 * 10) / 10;
    } else {
      this.calculatedDuration = 0;
    }
  }

  private detectConflicts(): void {
    const { dayOfWeek, startTime, endTime } = this.availabilityForm.value;
    this.timeConflicts = [];

    if (!dayOfWeek || !startTime || !endTime || !this.data.existingAvailabilities) {
      return;
    }

    const dayAvailabilities = this.data.existingAvailabilities.filter(
      a => a.dayOfWeek === dayOfWeek
    );

    for (const existing of dayAvailabilities) {
      const existingStart = this.timeToMinutes(existing.startTime);
      const existingEnd = this.timeToMinutes(existing.endTime);
      const newStart = this.timeToMinutes(startTime);
      const newEnd = this.timeToMinutes(endTime);

      // Detectar solapamientos
      if (
        (newStart < existingEnd && newEnd > existingStart) ||
        (existingStart < newEnd && existingEnd > newStart)
      ) {
        this.timeConflicts.push({
          availability: existing,
          type: 'overlap'
        });
      }
      // Detectar horarios adyacentes (opcional, para información)
      else if (
        Math.abs(newEnd - existingStart) <= 15 ||
        Math.abs(existingEnd - newStart) <= 15
      ) {
        this.timeConflicts.push({
          availability: existing,
          type: 'adjacent'
        });
      }
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // CORREGIDO: Validador personalizado con el tipo correcto
  private timeRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control || !control.get) {
        return null;
      }

      const startTime = control.get('startTime')?.value;
      const endTime = control.get('endTime')?.value;

      if (startTime && endTime) {
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);

        if (endMinutes <= startMinutes) {
          control.get('endTime')?.setErrors({ invalidTimeRange: true });
          return { invalidTimeRange: true };
        } else {
          // Limpiar error si el rango es válido
          const endTimeControl = control.get('endTime');
          if (endTimeControl?.errors) {
            const { invalidTimeRange, ...otherErrors } = endTimeControl.errors;
            const hasOtherErrors = Object.keys(otherErrors).length > 0;
            endTimeControl.setErrors(hasOtherErrors ? otherErrors : null);
          }
        }
      }

      return null;
    };
  }

  private generateSuggestions(): void {
    const commonTimeSlots = [
      { startTime: '07:00', endTime: '12:00', duration: 5 },
      { startTime: '08:00', endTime: '12:00', duration: 4 },
      { startTime: '13:00', endTime: '17:00', duration: 4 },
      { startTime: '14:00', endTime: '18:00', duration: 4 },
      { startTime: '18:00', endTime: '22:00', duration: 4 },
      { startTime: '07:00', endTime: '10:00', duration: 3 },
      { startTime: '10:00', endTime: '13:00', duration: 3 },
      { startTime: '15:00', endTime: '18:00', duration: 3 }
    ];

    this.suggestedTimes = commonTimeSlots;
  }

  applySuggestion(suggestion: { startTime: string; endTime: string }): void {
    this.availabilityForm.patchValue({
      startTime: suggestion.startTime,
      endTime: suggestion.endTime
    });
  }

  getCurrentDayLabel(): string {
    const dayValue = this.availabilityForm.get('dayOfWeek')?.value;
    const day = this.daysOfWeek.find(d => d.value === dayValue);
    return day?.label || '';
  }

  onSave(): void {
    if (!this.availabilityForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.availabilityForm.value;
    const request: TeacherAvailabilityRequest = {
      dayOfWeek: formValue.dayOfWeek,
      startTime: formValue.startTime,
      endTime: formValue.endTime
    };

    this.loading = true;

    const operation = this.isEditing
      ? this.disponibilidadService.updateAvailability(this.data.editingAvailability!.uuid, request)
      : this.disponibilidadService.createAvailability(this.data.teacherUuid, {
        ...request,
        replaceExisting: formValue.replaceOverlapping,
        overlappingUuids: this.timeConflicts
          .filter(c => c.type === 'overlap')
          .map(c => c.availability.uuid)
      });

    operation
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          const message = this.isEditing
            ? 'Disponibilidad actualizada correctamente'
            : 'Disponibilidad agregada correctamente';

          this.showMessage(message, 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al guardar disponibilidad:', error);
          let errorMessage = 'Error al guardar la disponibilidad';

          if (error.error?.message) {
            errorMessage = error.error.message;
          }

          this.showMessage(errorMessage, 'error');
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.availabilityForm.controls).forEach(key => {
      const control = this.availabilityForm.get(key);
      control?.markAsTouched();
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: `${type}-snackbar`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
