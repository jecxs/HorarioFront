// src/app/features/time-slots/components/teaching-hours-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { TimeSlot, TeachingHour } from '../services/time-slot.service';

interface DialogData {
  timeSlot: TimeSlot;
}

@Component({
  selector: 'app-teaching-hours-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>view_module</mat-icon>
      Detalle de Horas Pedagógicas - {{ data.timeSlot.name }}
    </h2>

    <div mat-dialog-content class="dialog-content">
      <!-- Información del Turno -->
      <mat-card class="slot-info-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>schedule</mat-icon>
            Información del Turno
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="slot-details">
            <div class="detail-row">
              <span class="label">Nombre:</span>
              <span class="value">{{ data.timeSlot.name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Horario:</span>
              <span class="value">{{ data.timeSlot.startTime }} - {{ data.timeSlot.endTime }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Duración Total:</span>
              <span class="value">{{ getTotalDuration() }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Horas Pedagógicas:</span>
              <span class="value">{{ data.timeSlot.teachingHours.length }} bloques</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Timeline Visual -->
      <div class="timeline-section">
        <h3>
          <mat-icon>timeline</mat-icon>
          Línea de Tiempo Visual
        </h3>
        <div class="visual-timeline">
          <div class="timeline-bar">
            <div
              class="time-segment"
              *ngFor="let hour of data.timeSlot.teachingHours; let i = index"
              [style.background-color]="getHourColor(i)"
              [style.flex]="getSegmentFlex(hour)"
              [title]="getHourTooltip(hour)">
              <span class="segment-label">{{ hour.orderInTimeSlot }}</span>
            </div>
          </div>
          <div class="timeline-labels">
            <span class="start-time">{{ data.timeSlot.startTime }}</span>
            <span class="end-time">{{ data.timeSlot.endTime }}</span>
          </div>
        </div>
      </div>

      <!-- Lista Detallada de Horas -->
      <div class="hours-detail-section">
        <h3>
          <mat-icon>list</mat-icon>
          Detalle de Cada Hora Pedagógica
        </h3>

        <mat-list class="hours-detail-list">
          <mat-list-item
            *ngFor="let hour of data.timeSlot.teachingHours; let i = index"
            class="hour-detail-item">

            <mat-icon
              matListItemIcon
              [style.color]="getHourColor(i)">
              looks_{{ hour.orderInTimeSlot }}
            </mat-icon>

            <div matListItemTitle class="hour-title">
              Hora Pedagógica {{ hour.orderInTimeSlot }}
            </div>

            <div matListItemLine class="hour-details">
              <div class="time-info">
                <mat-icon>schedule</mat-icon>
                <span>{{ hour.startTime }} - {{ hour.endTime }}</span>
              </div>

              <div class="duration-info">
                <mat-icon>timer</mat-icon>
                <span>{{ hour.durationMinutes }} minutos</span>
              </div>

              <div class="position-info">
                <mat-icon>place</mat-icon>
                <span>Posición {{ hour.orderInTimeSlot }} de {{ data.timeSlot.teachingHours.length }}</span>
              </div>
            </div>

            <mat-chip
              [style.background-color]="getHourColor(i)"
              [style.color]="'white'"
              class="hour-chip">
              {{ hour.durationMinutes }}min
            </mat-chip>

          </mat-list-item>
        </mat-list>
      </div>

      <!-- Información de Uso -->
      <div class="usage-info-section">
        <mat-card class="usage-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              ¿Cómo se usan estas horas?
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="usage-explanations">
              <div class="usage-item">
                <mat-icon>assignment</mat-icon>
                <div class="usage-text">
                  <strong>Asignación de Clases:</strong> Cada clase puede ocupar una o más horas pedagógicas consecutivas
                </div>
              </div>

              <div class="usage-item">
                <mat-icon>group</mat-icon>
                <div class="usage-text">
                  <strong>Grupos de Estudiantes:</strong> Se asignan clases en bloques específicos de este turno
                </div>
              </div>

              <div class="usage-item">
                <mat-icon>person</mat-icon>
                <div class="usage-text">
                  <strong>Docentes:</strong> Pueden tener clases asignadas en horas específicas de este turno
                </div>
              </div>

              <div class="usage-item">
                <mat-icon>room</mat-icon>
                <div class="usage-text">
                  <strong>Aulas:</strong> Se ocupan durante las horas pedagógicas asignadas
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Estadísticas -->
      <div class="stats-section">
        <h3>
          <mat-icon>analytics</mat-icon>
          Estadísticas del Turno
        </h3>

        <div class="stats-grid">
          <div class="stat-item">
            <mat-icon>schedule</mat-icon>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalMinutes() }}</div>
              <div class="stat-label">Minutos Total</div>
            </div>
          </div>

          <div class="stat-item">
            <mat-icon>view_module</mat-icon>
            <div class="stat-content">
              <div class="stat-value">{{ data.timeSlot.teachingHours.length }}</div>
              <div class="stat-label">Horas Pedagógicas</div>
            </div>
          </div>

          <div class="stat-item">
            <mat-icon>timer</mat-icon>
            <div class="stat-content">
              <div class="stat-value">{{ getAverageDuration() }}</div>
              <div class="stat-label">Promedio por Hora</div>
            </div>
          </div>

          <div class="stat-item">
            <mat-icon>check_circle</mat-icon>
            <div class="stat-content">
              <div class="stat-value">0</div>
              <div class="stat-label">Minutos Perdidos</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-raised-button color="primary" (click)="onClose()">
        <mat-icon>close</mat-icon>
        Cerrar
      </button>
    </div>
  `,
  styles: [`
    .dialog-content {
      min-width: 600px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .slot-info-card {
      margin-bottom: 24px;

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .slot-details {
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          .label {
            font-weight: 500;
            color: #666;
          }

          .value {
            font-weight: 600;
            color: #333;
          }
        }
      }
    }

    .timeline-section {
      margin-bottom: 32px;

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        color: #333;

        mat-icon {
          color: #1976d2;
        }
      }

      .visual-timeline {
        background: #f9f9f9;
        border-radius: 12px;
        padding: 20px;

        .timeline-bar {
          display: flex;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          background: #e0e0e0;
          margin-bottom: 12px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);

          .time-segment {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
            border-right: 1px solid rgba(255,255,255,0.3);

            &:hover {
              transform: scaleY(1.1);
              z-index: 2;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }

            &:last-child {
              border-right: none;
            }

            .segment-label {
              color: white;
              font-weight: 600;
              font-size: 1.1rem;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
          }
        }

        .timeline-labels {
          display: flex;
          justify-content: space-between;
          color: #666;
          font-weight: 500;

          .start-time, .end-time {
            padding: 4px 8px;
            background: #fff;
            border-radius: 4px;
            font-size: 0.9rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        }
      }
    }

    .hours-detail-section {
      margin-bottom: 32px;

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        color: #333;

        mat-icon {
          color: #1976d2;
        }
      }

      .hours-detail-list {
        background: #f9f9f9;
        border-radius: 8px;
        padding: 8px;

        .hour-detail-item {
          background: white;
          border-radius: 8px;
          margin-bottom: 8px;
          padding: 16px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: transform 0.2s;

          &:hover {
            transform: translateX(4px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }

          &:last-child {
            margin-bottom: 0;
          }

          .hour-title {
            font-weight: 600;
            color: #333;
            font-size: 1.1rem;
          }

          .hour-details {
            display: flex;
            gap: 24px;
            margin-top: 8px;

            .time-info, .duration-info, .position-info {
              display: flex;
              align-items: center;
              gap: 6px;
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

          .hour-chip {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 600;
          }
        }
      }
    }

    .usage-info-section {
      margin-bottom: 32px;

      .usage-card {
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .usage-explanations {
          .usage-item {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            align-items: flex-start;

            &:last-child {
              margin-bottom: 0;
            }

            mat-icon {
              color: #1976d2;
              margin-top: 2px;
              font-size: 20px;
              width: 20px;
              height: 20px;
            }

            .usage-text {
              flex: 1;
              line-height: 1.4;

              strong {
                color: #333;
                display: block;
                margin-bottom: 2px;
              }
            }
          }
        }
      }
    }

    .stats-section {
      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        color: #333;

        mat-icon {
          color: #1976d2;
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;

        .stat-item {
          background: white;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #1976d2;

          mat-icon {
            color: #1976d2;
            font-size: 2rem;
            width: 2rem;
            height: 2rem;
            margin-bottom: 8px;
          }

          .stat-content {
            .stat-value {
              font-size: 1.5rem;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }

            .stat-label {
              font-size: 0.8rem;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          }
        }
      }
    }

    .dialog-actions {
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .dialog-content {
        min-width: 350px;
      }

      .hour-details {
        flex-direction: column !important;
        gap: 8px !important;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class TeachingHoursDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TeachingHoursDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  getTotalDuration(): string {
    const startTime = this.data.timeSlot.startTime;
    const endTime = this.data.timeSlot.endTime;
    const totalMinutes = this.calculateDurationInMinutes(startTime, endTime);
    return this.formatMinutes(totalMinutes);
  }

  getTotalMinutes(): number {
    const startTime = this.data.timeSlot.startTime;
    const endTime = this.data.timeSlot.endTime;
    return this.calculateDurationInMinutes(startTime, endTime);
  }

  getAverageDuration(): string {
    if (this.data.timeSlot.teachingHours.length === 0) return '0min';

    const totalMinutes = this.data.timeSlot.teachingHours.reduce(
      (sum, hour) => sum + hour.durationMinutes, 0
    );
    const average = Math.round(totalMinutes / this.data.timeSlot.teachingHours.length);
    return `${average}min`;
  }

  getHourColor(index: number): string {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
      '#c62828', '#00796b', '#5d4037', '#455a64'
    ];
    return colors[index % colors.length];
  }

  getHourTooltip(hour: TeachingHour): string {
    return `Hora ${hour.orderInTimeSlot}: ${hour.startTime} - ${hour.endTime} (${hour.durationMinutes} min)`;
  }

  getSegmentFlex(hour: TeachingHour): number {
    // Todos los segmentos tienen el mismo tamaño en este diseño
    // Pero podrías hacer que sea proporcional a la duración si fuera necesario
    return 1;
  }

  private calculateDurationInMinutes(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return end - start;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
