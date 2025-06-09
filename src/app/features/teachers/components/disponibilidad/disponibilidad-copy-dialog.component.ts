// src/app/features/docentes/components/disponibilidad/disponibilidad-copy-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { finalize } from 'rxjs/operators';

import { DisponibilidadService } from '../../services/disponibilidad.service';
import { TeacherAvailabilityResponse, DayOfWeek, DAY_LABELS } from '../../models/disponibilidad.model';

interface DialogData {
  teacherUuid: string;
  teacherName: string;
  availabilities: TeacherAvailabilityResponse[];
}

interface DayWithAvailabilities {
  day: DayOfWeek;
  label: string;
  availabilities: TeacherAvailabilityResponse[];
  totalHours: number;
}

@Component({
  selector: 'app-disponibilidad-copy-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatListModule
  ],
  template: `
    <div class="copy-dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>content_copy</mat-icon>
        Copiar Disponibilidades
        <span class="teacher-name">{{ data.teacherName }}</span>
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="copyForm" class="copy-form">

          <!-- Día origen -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Copiar disponibilidades desde</mat-label>
            <mat-select formControlName="fromDay" (selectionChange)="onFromDayChange()">
              <mat-option
                *ngFor="let dayData of daysWithAvailabilities"
                [value]="dayData.day"
                [disabled]="dayData.availabilities.length === 0">
                {{ dayData.label }}
                <span class="day-info" *ngIf="dayData.availabilities.length > 0">
                  ({{ dayData.availabilities.length }} bloque{{ dayData.availabilities.length > 1 ? 's' : '' }}, {{ dayData.totalHours }}h)
                </span>
                <span class="day-empty" *ngIf="dayData.availabilities.length === 0">
                  (sin disponibilidades)
                </span>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="copyForm.get('fromDay')?.hasError('required')">
              Seleccione el día origen
            </mat-error>
          </mat-form-field>

          <!-- Vista previa de disponibilidades a copiar -->
          <div *ngIf="selectedFromDayData" class="preview-section">
            <h4 class="preview-title">
              <mat-icon>preview</mat-icon>
              Disponibilidades a copiar
            </h4>

            <mat-list class="availabilities-list">
              <mat-list-item *ngFor="let availability of selectedFromDayData.availabilities">
                <mat-icon matListItemIcon>schedule</mat-icon>
                <div matListItemTitle>
                  {{ availability.startTime.slice(0,5) }} - {{ availability.endTime.slice(0,5) }}
                </div>
                <div matListItemLine>
                  Duración: {{ calculateDuration(availability.startTime, availability.endTime) }} horas
                </div>
              </mat-list-item>
            </mat-list>
          </div>

          <!-- Días destino -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Copiar hacia</mat-label>
            <mat-select formControlName="toDays" multiple>
              <mat-option
                *ngFor="let dayData of daysWithAvailabilities"
                [value]="dayData.day"
                [disabled]="dayData.day === copyForm.get('fromDay')?.value">
                {{ dayData.label }}
                <span class="day-info" *ngIf="dayData.availabilities.length > 0">
                  ({{ dayData.availabilities.length }} existente{{ dayData.availabilities.length > 1 ? 's' : '' }})
                </span>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="copyForm.get('toDays')?.hasError('required')">
              Seleccione al menos un día destino
            </mat-error>
          </mat-form-field>

          <!-- Opciones de copia -->
          <div class="copy-options">
            <h4 class="options-title">Opciones de copia</h4>

            <mat-checkbox formControlName="replaceExisting">
              Reemplazar disponibilidades existentes en días destino
            </mat-checkbox>

            <p class="option-description">
              <mat-icon>info</mat-icon>
              Si no está marcado, las nuevas disponibilidades se agregarán a las existentes.
              Si existe conflicto de horarios, la operación fallará.
            </p>
          </div>

          <!-- Resumen de la operación -->
          <div *ngIf="getSelectedToDays().length > 0" class="operation-summary">
            <h4 class="summary-title">
              <mat-icon>summarize</mat-icon>
              Resumen de la operación
            </h4>

            <div class="summary-content">
              <p><strong>Desde:</strong> {{ getFromDayLabel() }}</p>
              <p><strong>Hacia:</strong> {{ getSelectedToDaysLabels().join(', ') }}</p>
              <p><strong>Disponibilidades:</strong> {{ getSelectedAvailabilitiesCount() }}</p>
              <p><strong>Acción:</strong>
                {{ copyForm.get('replaceExisting')?.value ? 'Reemplazar existentes' : 'Agregar a existentes' }}
              </p>
            </div>

            <div *ngIf="copyForm.get('replaceExisting')?.value" class="warning-message">
              <mat-icon color="warn">warning</mat-icon>
              <span>Se eliminarán todas las disponibilidades existentes en los días destino</span>
            </div>
          </div>
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
          (click)="onCopy()"
          [disabled]="loading || !copyForm.valid || getSelectedToDays().length === 0">

          <mat-spinner
            *ngIf="loading"
            diameter="16"
            class="button-spinner">
          </mat-spinner>

          <mat-icon *ngIf="!loading">content_copy</mat-icon>
          Copiar disponibilidades
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./disponibilidad-copy-dialog.component.scss']
})
export class DisponibilidadCopyDialogComponent implements OnInit {
  copyForm!: FormGroup;
  loading = false;
  daysWithAvailabilities: DayWithAvailabilities[] = [];
  selectedFromDayData: DayWithAvailabilities | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DisponibilidadCopyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private disponibilidadService: DisponibilidadService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.processDaysData();
  }

  private initializeForm(): void {
    this.copyForm = this.fb.group({
      fromDay: ['', [Validators.required]],
      toDays: [[], [Validators.required]],
      replaceExisting: [false]
    });
  }

  private processDaysData(): void {
    const dayLabels = DAY_LABELS;
    const orderedDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    this.daysWithAvailabilities = orderedDays.map(day => {
      const dayAvailabilities = this.data.availabilities.filter(a => a.dayOfWeek === day);
      const totalHours = this.calculateTotalHours(dayAvailabilities);

      return {
        day,
        label: dayLabels[day],
        availabilities: dayAvailabilities,
        totalHours
      };
    });
  }

  private calculateTotalHours(availabilities: TeacherAvailabilityResponse[]): number {
    return availabilities.reduce((total, availability) => {
      return total + this.calculateDuration(availability.startTime, availability.endTime);
    }, 0);
  }

  calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return Math.round((endMinutes - startMinutes) / 60 * 10) / 10;
  }

  onFromDayChange(): void {
    const fromDay = this.copyForm.get('fromDay')?.value;
    this.selectedFromDayData = this.daysWithAvailabilities.find(d => d.day === fromDay) || null;

    // Limpiar días destino si el día origen cambia
    this.copyForm.get('toDays')?.setValue([]);
  }

  getSelectedToDays(): DayOfWeek[] {
    return this.copyForm.get('toDays')?.value || [];
  }

  getFromDayLabel(): string {
    const fromDay = this.copyForm.get('fromDay')?.value;
    return this.daysWithAvailabilities.find(d => d.day === fromDay)?.label || '';
  }

  getSelectedToDaysLabels(): string[] {
    const toDays = this.getSelectedToDays();
    return toDays.map(day =>
      this.daysWithAvailabilities.find(d => d.day === day)?.label || ''
    );
  }

  // CORREGIDO: Método separado para obtener el conteo de disponibilidades
  getSelectedAvailabilitiesCount(): number {
    return this.selectedFromDayData ? this.selectedFromDayData.availabilities.length : 0;
  }

  onCopy(): void {
    if (!this.copyForm.valid || !this.selectedFromDayData) {
      return;
    }

    const fromDay = this.copyForm.get('fromDay')?.value;
    const toDays = this.getSelectedToDays();
    const replaceExisting = this.copyForm.get('replaceExisting')?.value;

    this.loading = true;

    // Realizar las copias secuencialmente
    this.copyToMultipleDays(fromDay, toDays, replaceExisting);
  }

  private async copyToMultipleDays(fromDay: DayOfWeek, toDays: DayOfWeek[], replaceExisting: boolean): Promise<void> {
    let successCount = 0;
    let errorCount = 0;

    for (const toDay of toDays) {
      try {
        await this.disponibilidadService.copyAvailabilitiesFromDay(
          this.data.teacherUuid,
          fromDay,
          toDay,
          replaceExisting
        ).toPromise();

        successCount++;
      } catch (error) {
        console.error(`Error copiando a ${toDay}:`, error);
        errorCount++;
      }
    }

    this.loading = false;

    // Mostrar resultado
    if (successCount === toDays.length) {
      this.showMessage(`Disponibilidades copiadas exitosamente a ${successCount} día${successCount > 1 ? 's' : ''}`, 'success');
      this.dialogRef.close(true);
    } else if (successCount > 0) {
      this.showMessage(`Copiado a ${successCount} de ${toDays.length} días. ${errorCount} fallaron.`, 'warning');
      this.dialogRef.close(true);
    } else {
      this.showMessage('Error al copiar las disponibilidades', 'error');
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: `${type}-snackbar`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
