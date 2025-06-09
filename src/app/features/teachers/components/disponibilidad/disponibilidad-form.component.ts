// src/app/features/docentes/components/disponibilidad/disponibilidad-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';

import {
  TeacherAvailabilityResponse,
  TeacherAvailabilityRequest,
  DayOfWeek,
  DAYS_OF_WEEK
} from '../../models/disponibilidad.model';
import { ModernTimePickerComponent } from './modern-time-picker.component';

@Component({
  selector: 'app-disponibilidad-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDialogModule,
    ModernTimePickerComponent
  ],
  template: `
    <!-- Template actualizado usando los getters -->
    <div class="availability-form-container">
      <form [formGroup]="availabilityForm" (ngSubmit)="onSubmit()" class="availability-form">

        <!-- Header del formulario -->
        <div class="form-header">
          <h3 class="form-title">
            <mat-icon>{{ editMode ? 'edit' : 'add' }}</mat-icon>
            {{ editMode ? 'Editar' : 'Agregar' }} Disponibilidad
          </h3>
          <p class="form-subtitle" *ngIf="editMode">
            Editando disponibilidad para {{ getDayName(editingAvailability?.dayOfWeek) }}
          </p>
        </div>

        <!-- Día de la semana -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Día de la semana</mat-label>
          <mat-select formControlName="dayOfWeek" [disabled]="editMode">
            <mat-option *ngFor="let day of daysOfWeek" [value]="day.value">
              <div class="day-option">
                <span>{{ day.label }}</span>
                <span class="day-count" *ngIf="getAvailabilityCountForDay(day.value) > 0">
              ({{ getAvailabilityCountForDay(day.value) }} existente{{ getAvailabilityCountForDay(day.value) > 1 ? 's' : '' }})
            </span>
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="dayOfWeekHasError">
            {{ dayOfWeekErrorMessage }}
          </mat-error>
        </mat-form-field>

        <!-- Selectores de tiempo modernos -->
        <div class="time-section">
          <h4>Horario de Disponibilidad</h4>

          <div class="time-fields">
            <app-modern-time-picker
              formControlName="startTime"
              label="Hora de inicio"
              placeholder="Seleccionar inicio"
              [minHour]="6"
              [maxHour]="22"
              [minuteStep]="15"
              [hasError]="startTimeHasError"
              (timeChange)="onTimeChange()">
            </app-modern-time-picker>

            <app-modern-time-picker
              formControlName="endTime"
              label="Hora de fin"
              placeholder="Seleccionar fin"
              [minHour]="6"
              [maxHour]="22"
              [minuteStep]="15"
              [hasError]="endTimeHasError"
              (timeChange)="onTimeChange()">
            </app-modern-time-picker>
          </div>

          <!-- Mostrar errores de tiempo si existen -->
          <div class="field-errors" *ngIf="startTimeHasError || endTimeHasError">
            <div class="error-message" *ngIf="startTimeHasError">
              <mat-icon>error</mat-icon>
              {{ startTimeErrorMessage }}
            </div>
            <div class="error-message" *ngIf="endTimeHasError">
              <mat-icon>error</mat-icon>
              {{ endTimeErrorMessage }}
            </div>
          </div>

          <!-- Duración calculada -->
          <div class="duration-display" *ngIf="calculatedDuration">
            <mat-icon>schedule</mat-icon>
            <span>Duración: {{ calculatedDuration }}</span>
          </div>
        </div>

        <!-- Opciones avanzadas -->
        <div class="advanced-options" *ngIf="!editMode">
          <mat-checkbox formControlName="allowOverlap" class="overlap-checkbox">
            Permitir reemplazar horarios existentes en este día
          </mat-checkbox>
          <p class="overlap-help-text">
            Al activar esta opción, se eliminarán automáticamente las disponibilidades que se solapen con el nuevo horario.
          </p>
        </div>

        <!-- Advertencias y errores -->
        <div class="form-warnings">
          <!-- Error de validación de tiempo -->
          <div *ngIf="hasTimeError" class="warning-card error">
            <mat-icon>error</mat-icon>
            <div class="warning-content">
              <strong>Error de horario</strong>
              <p>{{ timeErrorMessage }}</p>
            </div>
          </div>

          <!-- Advertencia de solapamiento -->
          <div *ngIf="hasOverlapWarning && !allowOverlap" class="warning-card warning">
            <mat-icon>warning</mat-icon>
            <div class="warning-content">
              <strong>Conflicto de horario</strong>
              <p>{{ overlapWarningMessage }}</p>
              <p class="warning-suggestion">
                Puedes activar "Permitir reemplazar horarios existentes" para resolver automáticamente este conflicto.
              </p>
            </div>
          </div>

          <!-- Información de reemplazo -->
          <div *ngIf="hasOverlapWarning && allowOverlap" class="warning-card info">
            <mat-icon>info</mat-icon>
            <div class="warning-content">
              <strong>Reemplazo automático</strong>
              <p>Se eliminarán {{ overlappingAvailabilities.length }} disponibilidad(es) existente(s) y se creará la nueva.</p>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="form-actions">
          <button
            mat-button
            type="button"
            (click)="onCancel()"
            class="cancel-button">
            <mat-icon>close</mat-icon>
            Cancelar
          </button>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="!canSubmit()"
            class="submit-button">
            <mat-icon>{{ editMode ? 'save' : 'add' }}</mat-icon>
            {{ editMode ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./disponibilidad-form.component.scss']
})
export class DisponibilidadFormComponent implements OnInit {
  @Input() initialDay: DayOfWeek | null = null;
  @Input() daysOfWeek = DAYS_OF_WEEK;
  @Input() existingAvailabilities: TeacherAvailabilityResponse[] = [];
  @Input() editingAvailability: TeacherAvailabilityResponse | null = null;

  @Output() formSubmit = new EventEmitter<TeacherAvailabilityRequest>();
  @Output() formUpdate = new EventEmitter<{uuid: string, data: TeacherAvailabilityRequest}>();
  @Output() formCancel = new EventEmitter<void>();

  availabilityForm: FormGroup;
  editMode = false;

  // Validaciones y warnings
  hasTimeError = false;
  timeErrorMessage = '';
  hasOverlapWarning = false;
  overlapWarningMessage = '';
  overlappingAvailabilities: TeacherAvailabilityResponse[] = [];
  calculatedDuration = '';

  constructor(private fb: FormBuilder) {
    this.availabilityForm = this.createForm();
  }

  ngOnInit(): void {
    this.editMode = !!this.editingAvailability;

    if (this.editMode && this.editingAvailability) {
      this.loadEditData();
    } else if (this.initialDay) {
      this.availabilityForm.patchValue({
        dayOfWeek: this.initialDay
      });
    }

    this.setupValidations();
  }

  createForm(): FormGroup {
    return this.fb.group({
      dayOfWeek: [null, Validators.required],
      startTime: [null, Validators.required],
      endTime: [null, Validators.required],
      allowOverlap: [false]
    });
  }

  loadEditData(): void {
    if (this.editingAvailability) {
      this.availabilityForm.patchValue({
        dayOfWeek: this.editingAvailability.dayOfWeek,
        startTime: this.editingAvailability.startTime,
        endTime: this.editingAvailability.endTime,
        allowOverlap: false
      });
    }
  }

  setupValidations(): void {
    // Escuchar cambios en los campos para validaciones en tiempo real
    ['dayOfWeek', 'startTime', 'endTime', 'allowOverlap'].forEach(field => {
      this.availabilityForm.get(field)?.valueChanges.subscribe(() => {
        this.validateForm();
      });
    });
  }

  validateForm(): void {
    this.resetValidations();

    const startTime = this.availabilityForm.get('startTime')?.value;
    const endTime = this.availabilityForm.get('endTime')?.value;
    const day = this.availabilityForm.get('dayOfWeek')?.value;

    if (!startTime || !endTime || !day) {
      return;
    }

    // Validar orden de horas
    if (startTime >= endTime) {
      this.hasTimeError = true;
      this.timeErrorMessage = 'La hora de fin debe ser posterior a la hora de inicio';
      return;
    }

    // Calcular duración
    this.calculateDuration(startTime, endTime);

    // Verificar solapamientos
    this.checkOverlaps(day, startTime, endTime);
  }

  private resetValidations(): void {
    this.hasTimeError = false;
    this.timeErrorMessage = '';
    this.hasOverlapWarning = false;
    this.overlapWarningMessage = '';
    this.overlappingAvailabilities = [];
  }

  private calculateDuration(startTime: string, endTime: string): void {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      this.calculatedDuration = `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`;
    } else {
      this.calculatedDuration = `${minutes}min`;
    }
  }

  private checkOverlaps(day: DayOfWeek, startTime: string, endTime: string): void {
    this.overlappingAvailabilities = this.existingAvailabilities.filter(availability => {
      // Excluir la disponibilidad que se está editando
      if (this.editMode && this.editingAvailability && availability.uuid === this.editingAvailability.uuid) {
        return false;
      }

      if (availability.dayOfWeek !== day) {
        return false;
      }

      // Verificar solapamiento
      return (
        (startTime < availability.endTime && endTime > availability.startTime) ||
        (availability.startTime < endTime && availability.endTime > startTime)
      );
    });

    if (this.overlappingAvailabilities.length > 0) {
      this.hasOverlapWarning = true;
      const count = this.overlappingAvailabilities.length;
      this.overlapWarningMessage = `Este horario se solapa con ${count} disponibilidad${count > 1 ? 'es' : ''} existente${count > 1 ? 's' : ''}.`;
    }
  }

  get allowOverlap(): boolean {
    return this.availabilityForm.get('allowOverlap')?.value || false;
  }

  onTimeChange(): void {
    // Método llamado cuando cambian los selectores de tiempo
    this.validateForm();
  }

  getAvailabilityCountForDay(day: DayOfWeek): number {
    return this.existingAvailabilities.filter(a => a.dayOfWeek === day).length;
  }



  getDayName(day: DayOfWeek | undefined): string {
    if (!day) return '';
    const found = this.daysOfWeek.find(d => d.value === day);
    return found ? found.label : '';
  }

  // Getters para validación de errores
  get startTimeHasError(): boolean {
    const control = this.availabilityForm.get('startTime');
    return !!(control?.invalid && control?.touched);
  }

  get endTimeHasError(): boolean {
    const control = this.availabilityForm.get('endTime');
    return !!(control?.invalid && control?.touched);
  }

  get dayOfWeekHasError(): boolean {
    const control = this.availabilityForm.get('dayOfWeek');
    return !!(control?.invalid && control?.touched);
  }

  // Getters para obtener mensajes de error específicos
  get startTimeErrorMessage(): string {
    const control = this.availabilityForm.get('startTime');
    if (control?.hasError('required')) {
      return 'La hora de inicio es obligatoria';
    }
    return '';
  }

  get endTimeErrorMessage(): string {
    const control = this.availabilityForm.get('endTime');
    if (control?.hasError('required')) {
      return 'La hora de fin es obligatoria';
    }
    return '';
  }

  get dayOfWeekErrorMessage(): string {
    const control = this.availabilityForm.get('dayOfWeek');
    if (control?.hasError('required')) {
      return 'El día es obligatorio';
    }
    return '';
  }

  canSubmit(): boolean {
    return this.availabilityForm.valid &&
      !this.hasTimeError &&
      (!this.hasOverlapWarning || this.allowOverlap);
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;

    const formValue = this.availabilityForm.value;
    const availability: TeacherAvailabilityRequest = {
      dayOfWeek: formValue.dayOfWeek,
      startTime: formValue.startTime,
      endTime: formValue.endTime
    };

    if (this.editMode && this.editingAvailability) {
      this.formUpdate.emit({
        uuid: this.editingAvailability.uuid,
        data: availability
      });
    } else {
      // Si hay solapamientos y se permite reemplazar, incluir información adicional
      if (this.hasOverlapWarning && this.allowOverlap) {
        // Emitir evento especial para manejo de reemplazo
        this.formSubmit.emit({
          ...availability,
          replaceExisting: true,
          overlappingUuids: this.overlappingAvailabilities.map(a => a.uuid)
        } as any);
      } else {
        this.formSubmit.emit(availability);
      }
    }
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}
