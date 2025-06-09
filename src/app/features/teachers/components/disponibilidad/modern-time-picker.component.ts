// src/app/shared/components/modern-time-picker/modern-time-picker.component.ts
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface TimeValue {
  hour: number;
  minute: number;
}

@Component({
  selector: 'app-modern-time-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ModernTimePickerComponent),
      multi: true
    }
  ],
  template: `
    <div class="time-picker-container">
      <mat-form-field appearance="outline" class="time-display">
        <mat-label>{{ label }}</mat-label>
        <input
          matInput
          [value]="getDisplayValue()"
          readonly
          [placeholder]="placeholder"
          (click)="togglePicker()"
          [class.error]="hasError">
        <mat-icon matSuffix (click)="togglePicker()" class="time-icon">schedule</mat-icon>
      </mat-form-field>

      <div class="time-picker-dropdown" [class.open]="isOpen" *ngIf="isOpen">
        <div class="time-picker-header">
          <span>{{ label }}</span>
          <button mat-icon-button (click)="closePicker()" class="close-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="time-picker-content">
          <!-- Selector de Hora -->
          <div class="time-section">
            <h4>Hora</h4>
            <div class="time-grid hour-grid">
              <button
                *ngFor="let hour of hours"
                mat-button
                [class.selected]="selectedTime.hour === hour"
                (click)="selectHour(hour)"
                class="time-button">
                {{ formatNumber(hour) }}
              </button>
            </div>
          </div>

          <!-- Selector de Minutos -->
          <div class="time-section">
            <h4>Minutos</h4>
            <div class="time-grid minute-grid">
              <button
                *ngFor="let minute of minutes"
                mat-button
                [class.selected]="selectedTime.minute === minute"
                (click)="selectMinute(minute)"
                class="time-button">
                {{ formatNumber(minute) }}
              </button>
            </div>
          </div>
        </div>

        <div class="time-picker-actions">
          <button mat-button (click)="clearTime()">Limpiar</button>
          <button mat-raised-button color="primary" (click)="confirmTime()">Confirmar</button>
        </div>
      </div>
    </div>

    <div class="picker-overlay" *ngIf="isOpen" (click)="closePicker()"></div>
  `,
  styleUrls: ['./modern-time-picker.component.scss']
})
export class ModernTimePickerComponent implements ControlValueAccessor {
  @Input() label: string = 'Hora';
  @Input() placeholder: string = 'Seleccionar hora';
  @Input() minHour: number = 6;
  @Input() maxHour: number = 22;
  @Input() minuteStep: number = 15;
  @Input() hasError: boolean = false;
  @Output() timeChange = new EventEmitter<string>();

  isOpen = false;
  selectedTime: TimeValue = { hour: 8, minute: 0 };
  currentValue: string = '';

  hours: number[] = [];
  minutes: number[] = [];

  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor() {
    this.initializeTimeArrays();
  }

  private initializeTimeArrays(): void {
    // Generar horas
    for (let i = this.minHour; i <= this.maxHour; i++) {
      this.hours.push(i);
    }

    // Generar minutos con step
    for (let i = 0; i < 60; i += this.minuteStep) {
      this.minutes.push(i);
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value) {
      this.currentValue = value;
      this.parseTimeString(value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private parseTimeString(timeString: string): void {
    const [hourStr, minuteStr] = timeString.split(':');
    this.selectedTime = {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  }

  getDisplayValue(): string {
    if (!this.currentValue) return '';
    return this.formatTimeDisplay(this.currentValue);
  }

  private formatTimeDisplay(time: string): string {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

    return `${displayHour}:${this.formatNumber(minute)} ${period}`;
  }

  formatNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  togglePicker(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  closePicker(): void {
    this.isOpen = false;
  }

  selectHour(hour: number): void {
    this.selectedTime.hour = hour;
  }

  selectMinute(minute: number): void {
    this.selectedTime.minute = minute;
  }

  confirmTime(): void {
    const timeString = `${this.formatNumber(this.selectedTime.hour)}:${this.formatNumber(this.selectedTime.minute)}`;
    this.currentValue = timeString;
    this.onChange(timeString);
    this.timeChange.emit(timeString);
    this.closePicker();
  }

  clearTime(): void {
    this.currentValue = '';
    this.selectedTime = { hour: 8, minute: 0 };
    this.onChange('');
    this.timeChange.emit('');
    this.closePicker();
  }
}
