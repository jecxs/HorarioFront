// src/app/features/class-assignments/components/hour-selector/hour-selector.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Services
import { TeachingHour, TimeSlot, ValidationResult, ClassAssignmentService } from '../../services/class-assignment.service';

interface HourBlock {
  hour: TeachingHour;
  timeSlot: TimeSlot;
  isSelected: boolean;
  isAvailable: boolean;
  hasConflict: boolean;
  conflictType?: 'TEACHER' | 'SPACE' | 'GROUP';
  conflictMessage?: string;
  isRecommended: boolean;
}

interface TimeSlotGroup {
  timeSlot: TimeSlot;
  hours: HourBlock[];
  isCollapsed: boolean;
  availableCount: number;
  selectedCount: number;
}

@Component({
  selector: 'app-hour-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatSnackBarModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HourSelectorComponent),
      multi: true
    }
  ],
  template: `
    <div class="hour-selector">
      <!-- Header con controles -->
      <div class="selector-header">
        <div class="selection-info">
          <h4>
            <mat-icon>schedule</mat-icon>
            Seleccionar Horas Pedagógicas
          </h4>
          <p class="selection-summary" *ngIf="selectedHours.length > 0">
            {{ selectedHours.length }} hora(s) seleccionada(s)
            <span class="time-range">({{ getSelectedTimeRange() }})</span>
          </p>
        </div>

        <div class="selector-controls">
          <mat-button-toggle-group
            [value]="selectionMode"
            (change)="changeSelectionMode($event.value)">
            <mat-button-toggle value="individual">
              <mat-icon>radio_button_checked</mat-icon>
              Individual
            </mat-button-toggle>
            <mat-button-toggle value="block">
              <mat-icon>view_module</mat-icon>
              Bloque
            </mat-button-toggle>
          </mat-button-toggle-group>

          <mat-slide-toggle
            [checked]="showOnlyAvailable"
            (change)="toggleAvailableOnly($event.checked)"
            color="primary">
            Solo disponibles
          </mat-slide-toggle>

          <button
            mat-stroked-button
            (click)="clearSelection()"
            [disabled]="selectedHours.length === 0">
            <mat-icon>clear</mat-icon>
            Limpiar
          </button>
        </div>
      </div>

      <!-- Alertas y validaciones -->
      <div class="validation-alerts" *ngIf="validationResult && !validationResult.isValid">
        <mat-card class="alert-card error">
          <mat-card-content>
            <div class="alert-header">
              <mat-icon>error</mat-icon>
              <span>Errores de Validación</span>
            </div>
            <ul class="alert-list">
              <li *ngFor="let error of validationResult.errors">{{ error }}</li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="validation-alerts" *ngIf="validationResult?.warnings.length">
        <mat-card class="alert-card warning">
          <mat-card-content>
            <div class="alert-header">
              <mat-icon>warning</mat-icon>
              <span>Advertencias</span>
            </div>
            <ul class="alert-list">
              <li *ngFor="let warning of validationResult.warnings">{{ warning }}</li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Timeline de turnos -->
      <div class="time-slots-container" [class.loading]="loading">
        <div class="loading-overlay" *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando horarios disponibles...</span>
        </div>

        <div class="no-hours" *ngIf="!loading && timeSlotGroups.length === 0">
          <mat-icon>schedule_off</mat-icon>
          <span>No hay horas pedagógicas disponibles para la configuración seleccionada</span>
          <p class="no-hours-help">
            Verifique que el docente tenga disponibilidad registrada y que no existan conflictos.
          </p>
        </div>

        <div class="time-slot-group" *ngFor="let group of timeSlotGroups; trackBy: trackByTimeSlotId">
          <!-- Header del turno -->
          <div class="time-slot-header" (click)="toggleTimeSlot(group)">
            <div class="slot-info">
              <div class="slot-main">
                <h5 class="slot-name">{{ group.timeSlot.name }}</h5>
                <span class="slot-time">{{ group.timeSlot.startTime }} - {{ group.timeSlot.endTime }}</span>
              </div>
              <div class="slot-stats">
                <mat-chip [color]="group.availableCount > 0 ? 'accent' : 'warn'" class="stat-chip">
                  {{ group.availableCount }}/{{ group.hours.length }} disponibles
                </mat-chip>
                <mat-chip
                  *ngIf="group.selectedCount > 0"
                  color="primary"
                  class="stat-chip">
                  {{ group.selectedCount }} seleccionadas
                </mat-chip>
              </div>
            </div>

            <div class="slot-actions">
              <button
                mat-icon-button
                *ngIf="group.availableCount > 0"
                (click)="$event.stopPropagation(); selectAllInTimeSlot(group)"
                matTooltip="Seleccionar todas las horas disponibles del turno">
                <mat-icon>select_all</mat-icon>
              </button>

              <button
                mat-icon-button
                (click)="$event.stopPropagation(); toggleTimeSlot(group)">
                <mat-icon>{{ group.isCollapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
              </button>
            </div>
          </div>

          <!-- Horas pedagógicas del turno -->
          <div class="hours-grid" *ngIf="!group.isCollapsed">
            <div
              class="hour-block"
              *ngFor="let hourBlock of group.hours; trackBy: trackByHourId"
              [class.selected]="hourBlock.isSelected"
              [class.available]="hourBlock.isAvailable"
              [class.conflict]="hourBlock.hasConflict"
              [class.recommended]="hourBlock.isRecommended"
              [class.disabled]="!hourBlock.isAvailable && !hourBlock.isSelected"
              (click)="toggleHour(hourBlock)"
              [matTooltip]="getHourTooltip(hourBlock)"
              matTooltipPosition="above">

              <!-- Contenido principal del bloque -->
              <div class="hour-content">
                <div class="hour-header">
                  <div class="hour-number">
                    <mat-icon class="hour-icon">{{ getHourIcon(hourBlock) }}</mat-icon>
                    <span class="hour-label">Hora {{ hourBlock.hour.orderInTimeSlot }}</span>
                  </div>

                  <div class="hour-indicators">
                    <mat-icon
                      *ngIf="hourBlock.isRecommended"
                      class="recommended-icon"
                      matTooltip="Hora recomendada">
                      star
                    </mat-icon>

                    <mat-icon
                      *ngIf="hourBlock.hasConflict"
                      class="conflict-icon"
                      [matTooltip]="hourBlock.conflictMessage">
                      warning
                    </mat-icon>
                  </div>
                </div>

                <div class="hour-time">
                  <span class="start-time">{{ formatTime(hourBlock.hour.startTime) }}</span>
                  <mat-icon class="time-separator">arrow_forward</mat-icon>
                  <span class="end-time">{{ formatTime(hourBlock.hour.endTime) }}</span>
                </div>

                <div class="hour-duration">
                  {{ hourBlock.hour.durationMinutes }} min
                </div>

                <!-- Estado del bloque -->
                <div class="hour-status">
                  <mat-chip
                    [color]="getHourStatusColor(hourBlock)"
                    class="status-chip">
                    {{ getHourStatusText(hourBlock) }}
                  </mat-chip>
                </div>
              </div>

              <!-- Checkbox de selección -->
              <div class="hour-checkbox">
                <mat-checkbox
                  [checked]="hourBlock.isSelected"
                  [disabled]="!hourBlock.isAvailable && !hourBlock.isSelected"
                  (change)="$event.stopPropagation(); toggleHour(hourBlock)"
                  color="primary">
                </mat-checkbox>
              </div>

              <!-- Overlay de selección -->
              <div class="selection-overlay" *ngIf="hourBlock.isSelected">
                <mat-icon>check_circle</mat-icon>
              </div>

              <!-- Indicador de conflicto -->
              <div class="conflict-overlay" *ngIf="hourBlock.hasConflict">
                <mat-icon>error</mat-icon>
              </div>
            </div>
          </div>

          <!-- Acciones rápidas del turno -->
          <div class="slot-quick-actions" *ngIf="!group.isCollapsed && group.availableCount > 0">
            <div class="quick-actions-bar">
              <button
                mat-stroked-button
                size="small"
                (click)="selectConsecutiveHours(group, 2)"
                [disabled]="!canSelectConsecutive(group, 2)">
                <mat-icon>looks_two</mat-icon>
                2 horas consecutivas
              </button>

              <button
                mat-stroked-button
                size="small"
                (click)="selectConsecutiveHours(group, 3)"
                [disabled]="!canSelectConsecutive(group, 3)">
                <mat-icon>looks_3</mat-icon>
                3 horas consecutivas
              </button>

              <button
                mat-stroked-button
                size="small"
                (click)="selectConsecutiveHours(group, 4)"
                [disabled]="!canSelectConsecutive(group, 4)">
                <mat-icon>looks_4</mat-icon>
                4 horas consecutivas
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen de selección -->
      <div class="selection-summary" *ngIf="selectedHours.length > 0">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>assignment</mat-icon>
              Resumen de Selección
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Horas seleccionadas:</span>
                <span class="stat-value">{{ selectedHours.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Duración total:</span>
                <span class="stat-value">{{ getTotalDuration() }} minutos</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Horario:</span>
                <span class="stat-value">{{ getSelectedTimeRange() }}</span>
              </div>
              <div class="stat-item" *ngIf="getSelectedTimeSlots().length > 1">
                <span class="stat-label">Turnos:</span>
                <span class="stat-value">{{ getSelectedTimeSlots().join(', ') }}</span>
              </div>
            </div>

            <div class="selected-hours-list">
              <div class="selected-hour" *ngFor="let hour of selectedHours">
                <span class="hour-info">
                  {{ hour.timeSlot.name }} - Hora {{ hour.hour.orderInTimeSlot }}
                </span>
                <span class="hour-time">
                  {{ formatTime(hour.hour.startTime) }} - {{ formatTime(hour.hour.endTime) }}
                </span>
                <button
                  mat-icon-button
                  size="small"
                  (click)="removeHour(hour)"
                  matTooltip="Eliminar hora">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .hour-selector {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        gap: 16px;

        .selection-info {
          h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 4px 0;
            color: #333;
          }

          .selection-summary {
            margin: 0;
            font-size: 14px;
            color: #666;

            .time-range {
              font-weight: 500;
              color: #2196f3;
            }
          }
        }

        .selector-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
      }

      .validation-alerts {
        .alert-card {
          &.error {
            background: #ffebee;
            border-left: 4px solid #f44336;
          }

          &.warning {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
          }

          .alert-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 500;

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }

          .alert-list {
            margin: 0;
            padding-left: 20px;

            li {
              margin-bottom: 4px;
              font-size: 13px;
            }
          }
        }
      }

      .time-slots-container {
        position: relative;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;

        &.loading {
          opacity: 0.7;
          pointer-events: none;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 10;

          span {
            color: #666;
            font-size: 14px;
          }
        }

        .no-hours {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
          gap: 8px;
          text-align: center;

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            opacity: 0.5;
          }

          .no-hours-help {
            font-size: 12px;
            color: #888;
            margin-top: 8px;
          }
        }

        .time-slot-group {
          border-bottom: 1px solid #e0e0e0;

          &:last-child {
            border-bottom: none;
          }

          .time-slot-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: #f8f9fa;
            cursor: pointer;
            transition: background-color 0.2s ease;

            &:hover {
              background: #e9ecef;
            }

            .slot-info {
              display: flex;
              align-items: center;
              gap: 16px;

              .slot-main {
                .slot-name {
                  margin: 0 0 2px 0;
                  font-size: 16px;
                  font-weight: 500;
                  color: #333;
                }

                .slot-time {
                  font-size: 12px;
                  color: #666;
                  font-family: 'Monaco', 'Menlo', monospace;
                }
              }

              .slot-stats {
                display: flex;
                gap: 8px;

                .stat-chip {
                  font-size: 10px;
                  height: 20px;
                  padding: 0 6px;
                }
              }
            }

            .slot-actions {
              display: flex;
              gap: 4px;
            }
          }

          .hours-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            padding: 16px;
            background: white;

            .hour-block {
              position: relative;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              padding: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              min-height: 120px;

              &:hover {
                border-color: #2196f3;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
              }

              &.available {
                border-color: #4caf50;
                background: #f1f8e9;

                &:hover {
                  background: #e8f5e8;
                }
              }

              &.selected {
                border-color: #2196f3;
                background: #e3f2fd;
                box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
              }

              &.conflict {
                border-color: #f44336;
                background: #ffebee;
              }

              &.recommended {
                border-color: #ff9800;
                background: #fff3e0;

                &::before {
                  content: '';
                  position: absolute;
                  top: -2px;
                  right: -2px;
                  width: 0;
                  height: 0;
                  border-left: 15px solid transparent;
                  border-top: 15px solid #ff9800;
                }
              }

              &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: #f5f5f5;
              }

              .hour-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 100%;

                .hour-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;

                  .hour-number {
                    display: flex;
                    align-items: center;
                    gap: 6px;

                    .hour-icon {
                      font-size: 16px;
                      width: 16px;
                      height: 16px;
                      color: #666;
                    }

                    .hour-label {
                      font-size: 12px;
                      font-weight: 500;
                      color: #333;
                    }
                  }

                  .hour-indicators {
                    display: flex;
                    gap: 4px;

                    .recommended-icon {
                      color: #ff9800;
                      font-size: 14px;
                      width: 14px;
                      height: 14px;
                    }

                    .conflict-icon {
                      color: #f44336;
                      font-size: 14px;
                      width: 14px;
                      height: 14px;
                    }
                  }
                }

                .hour-time {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  font-family: 'Monaco', 'Menlo', monospace;
                  font-size: 13px;
                  color: #333;

                  .time-separator {
                    font-size: 12px;
                    width: 12px;
                    height: 12px;
                    color: #666;
                  }

                  .start-time, .end-time {
                    font-weight: 500;
                  }
                }

                .hour-duration {
                  font-size: 11px;
                  color: #666;
                  text-align: center;
                  background: rgba(0, 0, 0, 0.05);
                  padding: 2px 6px;
                  border-radius: 4px;
                  align-self: center;
                }

                .hour-status {
                  margin-top: auto;

                  .status-chip {
                    font-size: 10px;
                    height: 18px;
                    padding: 0 6px;
                    width: 100%;
                  }
                }
              }

              .hour-checkbox {
                position: absolute;
                top: 8px;
                right: 8px;
              }

              .selection-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(33, 150, 243, 0.9);
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;

                mat-icon {
                  font-size: 20px;
                  width: 20px;
                  height: 20px;
                }
              }

              .conflict-overlay {
                position: absolute;
                bottom: 8px;
                left: 8px;
                background: #f44336;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;

                mat-icon {
                  font-size: 14px;
                  width: 14px;
                  height: 14px;
                }
              }
            }
          }

          .slot-quick-actions {
            padding: 8px 16px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;

            .quick-actions-bar {
              display: flex;
              gap: 8px;
              justify-content: center;

              button {
                font-size: 11px;
                height: 28px;

                mat-icon {
                  font-size: 14px;
                  width: 14px;
                  height: 14px;
                  margin-right: 4px;
                }
              }
            }
          }
        }
      }

      .selection-summary {
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 16px;

          .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;

            .stat-label {
              font-size: 12px;
              color: #666;
            }

            .stat-value {
              font-size: 14px;
              font-weight: 500;
              color: #333;
            }
          }
        }

        .selected-hours-list {
          .selected-hour {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            margin-bottom: 6px;
            background: white;

            &:last-child {
              margin-bottom: 0;
            }

            .hour-info {
              font-size: 12px;
              font-weight: 500;
              color: #333;
            }

            .hour-time {
              font-size: 11px;
              color: #666;
              font-family: 'Monaco', 'Menlo', monospace;
            }

            button {
              mat-icon {
                font-size: 16px;
                width: 16px;
                height: 16px;
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .hour-selector {
        .selector-header {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;

          .selector-controls {
            justify-content: center;
            flex-wrap: wrap;
          }
        }

        .time-slots-container {
          .hours-grid {
            grid-template-columns: 1fr;
            gap: 8px;
            padding: 12px;

            .hour-block {
              min-height: 100px;
            }
          }

          .slot-quick-actions {
            .quick-actions-bar {
              flex-direction: column;
              gap: 6px;

              button {
                width: 100%;
              }
            }
          }
        }

        .selection-summary {
          .summary-stats {
            grid-template-columns: 1fr;
          }
        }
      }
    }
  `]
})
export class HourSelectorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private destroy$ = new Subject<void>();

  @Input() availableHours: TeachingHour[] = [];
  @Input() selectedDay: string | null = null;
  @Input() teacherUuid: string | null = null;
  @Input() spaceUuid: string | null = null;
  @Input() groupUuid: string | null = null;

  @Output() hoursSelected = new EventEmitter<TeachingHour[]>();
  @Output() validationResult = new EventEmitter<ValidationResult>();

  // Data
  timeSlotGroups: TimeSlotGroup[] = [];
  selectedHours: HourBlock[] = [];

  // State
  loading = false;
  selectionMode: 'individual' | 'block' = 'individual';
  showOnlyAvailable = true;
  validationResult$: ValidationResult | null = null;

  // ControlValueAccessor
  value: string[] = [];
  onChange = (value: any) => {};
  onTouched = () => {};

  constructor(
    private classAssignmentService: ClassAssignmentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.buildTimeSlotGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value || [];
    this.updateSelectedHours();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  private buildTimeSlotGroups(): void {
    const timeSlotMap = new Map<string, TimeSlotGroup>();

    this.availableHours.forEach(hour => {
      // Simular que cada hora tiene un timeSlot asociado
      // En producción, esto vendría del backend
      const timeSlotId = this.getTimeSlotForHour(hour);
      const timeSlotName = this.getTimeSlotName(hour);

      if (!timeSlotMap.has(timeSlotId)) {
        timeSlotMap.set(timeSlotId, {
          timeSlot: {
            uuid: timeSlotId,
            name: timeSlotName,
            startTime: hour.startTime,
            endTime: hour.endTime,
            teachingHours: []
          },
          hours: [],
          isCollapsed: false,
          availableCount: 0,
          selectedCount: 0
        });
      }

      const group = timeSlotMap.get(timeSlotId)!;
      const hourBlock: HourBlock = {
        hour,
        timeSlot: group.timeSlot,
        isSelected: this.value.includes(hour.uuid),
        isAvailable: this.isHourAvailable(hour),
        hasConflict: this.hasHourConflict(hour),
        isRecommended: this.isHourRecommended(hour)
      };

      group.hours.push(hourBlock);
      if (hourBlock.isAvailable) group.availableCount++;
      if (hourBlock.isSelected) {
        group.selectedCount++;
        this.selectedHours.push(hourBlock);
      }
    });

    // Ordenar horas dentro de cada grupo
    timeSlotMap.forEach(group => {
      group.hours.sort((a, b) => a.hour.orderInTimeSlot - b.hour.orderInTimeSlot);
    });

    this.timeSlotGroups = Array.from(timeSlotMap.values());
    this.timeSlotGroups.sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime));
  }

  private updateSelectedHours(): void {
    this.selectedHours = [];
    this.timeSlotGroups.forEach(group => {
      group.selectedCount = 0;
      group.hours.forEach(hourBlock => {
        hourBlock.isSelected = this.value.includes(hourBlock.hour.uuid);
        if (hourBlock.isSelected) {
          this.selectedHours.push(hourBlock);
          group.selectedCount++;
        }
      });
    });
  }

  // === HOUR VALIDATION ===

  private isHourAvailable(hour: TeachingHour): boolean {
    // Simular disponibilidad - en producción usar datos reales del backend
    return Math.random() > 0.3; // 70% de probabilidad de estar disponible
  }

  private hasHourConflict(hour: TeachingHour): boolean {
    // Simular conflictos - en producción usar validación del backend
    return Math.random() > 0.8; // 20% de probabilidad de conflicto
  }

  private isHourRecommended(hour: TeachingHour): boolean {
    // Recomendar horas en horarios pedagógicamente óptimos
    const startHour = parseInt(hour.startTime.split(':')[0]);
    return startHour >= 8 && startHour <= 16; // Horario diurno recomendado
  }

  private getTimeSlotForHour(hour: TeachingHour): string {
    // Determinar turno basado en la hora
    const startHour = parseInt(hour.startTime.split(':')[0]);
    if (startHour < 12) return 'morning';
    if (startHour < 18) return 'afternoon';
    return 'evening';
  }

  private getTimeSlotName(hour: TeachingHour): string {
    const timeSlotId = this.getTimeSlotForHour(hour);
    const names = {
      'morning': 'Mañana',
      'afternoon': 'Tarde',
      'evening': 'Noche'
    };
    return names[timeSlotId as keyof typeof names] || 'Turno';
  }

  // === HOUR SELECTION ===

  toggleHour(hourBlock: HourBlock): void {
    if (!hourBlock.isAvailable && !hourBlock.isSelected) return;

    hourBlock.isSelected = !hourBlock.isSelected;

    if (hourBlock.isSelected) {
      this.selectedHours.push(hourBlock);
      this.value.push(hourBlock.hour.uuid);
    } else {
      this.selectedHours = this.selectedHours.filter(h => h.hour.uuid !== hourBlock.hour.uuid);
      this.value = this.value.filter(uuid => uuid !== hourBlock.hour.uuid);
    }

    this.updateGroupCounts();
    this.validateSelection();
    this.emitChanges();
  }

  removeHour(hourBlock: HourBlock): void {
    hourBlock.isSelected = false;
    this.selectedHours = this.selectedHours.filter(h => h.hour.uuid !== hourBlock.hour.uuid);
    this.value = this.value.filter(uuid => uuid !== hourBlock.hour.uuid);

    this.updateGroupCounts();
    this.emitChanges();
  }

  clearSelection(): void {
    this.selectedHours.forEach(hourBlock => {
      hourBlock.isSelected = false;
    });
    this.selectedHours = [];
    this.value = [];

    this.updateGroupCounts();
    this.emitChanges();
  }

  // === TIME SLOT OPERATIONS ===

  toggleTimeSlot(group: TimeSlotGroup): void {
    group.isCollapsed = !group.isCollapsed;
  }

  selectAllInTimeSlot(group: TimeSlotGroup): void {
    group.hours.forEach(hourBlock => {
      if (hourBlock.isAvailable && !hourBlock.isSelected) {
        hourBlock.isSelected = true;
        this.selectedHours.push(hourBlock);
        this.value.push(hourBlock.hour.uuid);
      }
    });

    this.updateGroupCounts();
    this.validateSelection();
    this.emitChanges();
  }

  selectConsecutiveHours(group: TimeSlotGroup, count: number): void {
    const availableHours = group.hours.filter(h => h.isAvailable && !h.isSelected);

    // Buscar el primer bloque consecutivo disponible
    for (let i = 0; i <= availableHours.length - count; i++) {
      const consecutiveBlock = availableHours.slice(i, i + count);

      // Verificar que sean consecutivos
      const isConsecutive = consecutiveBlock.every((hour, index) => {
        if (index === 0) return true;
        return hour.hour.orderInTimeSlot === consecutiveBlock[index - 1].hour.orderInTimeSlot + 1;
      });

      if (isConsecutive) {
        consecutiveBlock.forEach(hourBlock => {
          hourBlock.isSelected = true;
          this.selectedHours.push(hourBlock);
          this.value.push(hourBlock.hour.uuid);
        });

        this.updateGroupCounts();
        this.validateSelection();
        this.emitChanges();
        return;
      }
    }

    this.snackBar.open(
      `No hay ${count} horas consecutivas disponibles en este turno`,
      'Cerrar',
      { duration: 3000 }
    );
  }

  canSelectConsecutive(group: TimeSlotGroup, count: number): boolean {
    const availableHours = group.hours.filter(h => h.isAvailable && !h.isSelected);

    for (let i = 0; i <= availableHours.length - count; i++) {
      const consecutiveBlock = availableHours.slice(i, i + count);
      const isConsecutive = consecutiveBlock.every((hour, index) => {
        if (index === 0) return true;
        return hour.hour.orderInTimeSlot === consecutiveBlock[index - 1].hour.orderInTimeSlot + 1;
      });

      if (isConsecutive) return true;
    }

    return false;
  }

  // === UTILITY METHODS ===

  private updateGroupCounts(): void {
    this.timeSlotGroups.forEach(group => {
      group.selectedCount = group.hours.filter(h => h.isSelected).length;
    });
  }

  private validateSelection(): void {
    if (this.selectedHours.length === 0) {
      this.validationResult$ = null;
      return;
    }

    // Validar horas consecutivas en modo bloque
    if (this.selectionMode === 'block') {
      const sorted = [...this.selectedHours].sort((a, b) =>
        a.hour.orderInTimeSlot - b.hour.orderInTimeSlot
      );

      const isConsecutive = sorted.every((hour, index) => {
        if (index === 0) return true;
        return hour.hour.orderInTimeSlot === sorted[index - 1].hour.orderInTimeSlot + 1;
      });

      if (!isConsecutive) {
        this.validationResult$ = {
          isValid: false,
          errors: ['En modo bloque, las horas deben ser consecutivas'],
          warnings: []
        };
        this.validationResult.emit(this.validationResult$);
        return;
      }
    }

    // Validar duración máxima
    const totalDuration = this.getTotalDuration();
    if (totalDuration > 240) { // 4 horas
      this.validationResult$ = {
        isValid: true,
        errors: [],
        warnings: ['Sesión muy larga (más de 4 horas). Considere dividir en múltiples sesiones.']
      };
    } else {
      this.validationResult$ = {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    this.validationResult.emit(this.validationResult$);
  }

  private emitChanges(): void {
    this.onChange(this.value);
    this.onTouched();
    this.hoursSelected.emit(this.selectedHours.map(h => h.hour));
  }

  // === EVENT HANDLERS ===

  changeSelectionMode(mode: 'individual' | 'block'): void {
    this.selectionMode = mode;
    this.validateSelection();
  }

  toggleAvailableOnly(enabled: boolean): void {
    this.showOnlyAvailable = enabled;
    // Refilter available hours if needed
  }

  // === DISPLAY METHODS ===

  getHourIcon(hourBlock: HourBlock): string {
    if (hourBlock.hasConflict) return 'error';
    if (hourBlock.isSelected) return 'check_circle';
    if (hourBlock.isAvailable) return 'schedule';
    return 'schedule_off';
  }

  getHourStatusText(hourBlock: HourBlock): string {
    if (hourBlock.isSelected) return 'Seleccionada';
    if (hourBlock.hasConflict) return 'Conflicto';
    if (hourBlock.isAvailable) return 'Disponible';
    return 'Ocupada';
  }

  getHourStatusColor(hourBlock: HourBlock): string {
    if (hourBlock.isSelected) return 'primary';
    if (hourBlock.hasConflict) return 'warn';
    if (hourBlock.isAvailable) return 'accent';
    return '';
  }

  getHourTooltip(hourBlock: HourBlock): string {
    let tooltip = `Hora ${hourBlock.hour.orderInTimeSlot} - ${hourBlock.timeSlot.name}\n`;
    tooltip += `${this.formatTime(hourBlock.hour.startTime)} - ${this.formatTime(hourBlock.hour.endTime)}\n`;
    tooltip += `Duración: ${hourBlock.hour.durationMinutes} minutos\n`;

    if (hourBlock.hasConflict) {
      tooltip += `⚠️ ${hourBlock.conflictMessage || 'Conflicto detectado'}`;
    } else if (hourBlock.isRecommended) {
      tooltip += '⭐ Hora recomendada';
    } else if (hourBlock.isAvailable) {
      tooltip += '✅ Disponible para asignación';
    } else {
      tooltip += '❌ No disponible';
    }

    return tooltip;
  }

  formatTime(time: string): string {
    return time.slice(0, 5); // HH:mm
  }

  getTotalDuration(): number {
    return this.selectedHours.reduce((total, hour) => total + hour.hour.durationMinutes, 0);
  }

  getSelectedTimeRange(): string {
    if (this.selectedHours.length === 0) return '';

    const sorted = [...this.selectedHours].sort((a, b) =>
      a.hour.startTime.localeCompare(b.hour.startTime)
    );

    const startTime = this.formatTime(sorted[0].hour.startTime);
    const endTime = this.formatTime(sorted[sorted.length - 1].hour.endTime);

    return `${startTime} - ${endTime}`;
  }

  getSelectedTimeSlots(): string[] {
    const timeSlots = new Set(this.selectedHours.map(h => h.timeSlot.name));
    return Array.from(timeSlots);
  }

  // === TRACK BY ===

  trackByTimeSlotId(index: number, group: TimeSlotGroup): string {
    return group.timeSlot.uuid;
  }

  trackByHourId(index: number, hourBlock: HourBlock): string {
    return hourBlock.hour.uuid;
  }
}
