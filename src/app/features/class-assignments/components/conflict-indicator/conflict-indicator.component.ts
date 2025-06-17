// src/app/features/class-assignments/components/conflict-indicator/conflict-indicator.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

// Types
import { ClassSession } from '../../services/class-assignment.service';

export type ConflictType = 'TEACHER' | 'SPACE' | 'GROUP' | 'MULTIPLE';

interface ConflictDetails {
  type: ConflictType;
  message: string;
  affectedSessions: ClassSession[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestions: string[];
}

@Component({
  selector: 'app-conflict-indicator',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatBadgeModule,
    MatChipsModule,
    MatDialogModule
  ],
  template: `
    <div
      class="conflict-indicator"
      [class.low]="conflictDetails.severity === 'LOW'"
      [class.medium]="conflictDetails.severity === 'MEDIUM'"
      [class.high]="conflictDetails.severity === 'HIGH'"
      [class.critical]="conflictDetails.severity === 'CRITICAL'"
      [matTooltip]="getTooltipText()"
      matTooltipPosition="above"
      (click)="showDetails()">

      <!-- Icono principal del conflicto -->
      <div class="conflict-icon">
        <mat-icon [matBadge]="conflictDetails.affectedSessions.length" matBadgeColor="warn">
          {{ getConflictIcon() }}
        </mat-icon>
      </div>

      <!-- Información resumida -->
      <div class="conflict-info" *ngIf="showInfo">
        <div class="conflict-title">
          {{ getConflictTitle() }}
        </div>
        <div class="conflict-description">
          {{ conflictDetails.message }}
        </div>

        <!-- Chips de sesiones afectadas -->
        <div class="affected-sessions" *ngIf="conflictDetails.affectedSessions.length > 0">
          <mat-chip-set>
            <mat-chip
              *ngFor="let session of conflictDetails.affectedSessions.slice(0, 3)"
              [color]="getSessionChipColor(session)"
              class="session-chip">
              {{ getSessionDisplayText(session) }}
            </mat-chip>
            <mat-chip
              *ngIf="conflictDetails.affectedSessions.length > 3"
              color="accent">
              +{{ conflictDetails.affectedSessions.length - 3 }} más
            </mat-chip>
          </mat-chip-set>
        </div>

        <!-- Sugerencias rápidas -->
        <div class="quick-suggestions" *ngIf="conflictDetails.suggestions.length > 0">
          <div class="suggestion-item" *ngFor="let suggestion of conflictDetails.suggestions.slice(0, 2)">
            <mat-icon>lightbulb</mat-icon>
            <span>{{ suggestion }}</span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="conflict-actions" *ngIf="showActions">
          <button
            mat-stroked-button
            size="small"
            (click)="$event.stopPropagation(); resolveConflict()"
            [disabled]="!canResolve()">
            <mat-icon>auto_fix_high</mat-icon>
            Resolver
          </button>
          <button
            mat-stroked-button
            size="small"
            (click)="$event.stopPropagation(); showDetails()">
            <mat-icon>info</mat-icon>
            Detalles
          </button>
        </div>
      </div>

      <!-- Indicador de pulso para conflictos críticos -->
      <div class="pulse-indicator" *ngIf="conflictDetails.severity === 'CRITICAL'"></div>
    </div>
  `,
  styles: [`
    .conflict-indicator {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid transparent;

      &.low {
        background: #fff3e0;
        border-color: #ff9800;
        color: #e65100;

        &:hover {
          background: #ffe0b2;
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
        }
      }

      &.medium {
        background: #fff3e0;
        border-color: #ff9800;
        color: #e65100;

        &:hover {
          background: #ffe0b2;
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
        }
      }

      &.high {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;

        &:hover {
          background: #ffcdd2;
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
        }
      }

      &.critical {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
        animation: critical-pulse 2s infinite;

        &:hover {
          background: #ffcdd2;
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
        }
      }

      .conflict-icon {
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .conflict-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;

        .conflict-title {
          font-weight: 600;
          font-size: 12px;
          line-height: 1.2;
        }

        .conflict-description {
          font-size: 11px;
          opacity: 0.9;
          line-height: 1.3;
        }

        .affected-sessions {
          .session-chip {
            font-size: 9px;
            height: 16px;
            padding: 0 4px;
          }
        }

        .quick-suggestions {
          .suggestion-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            margin-bottom: 2px;

            &:last-child {
              margin-bottom: 0;
            }

            mat-icon {
              font-size: 12px;
              width: 12px;
              height: 12px;
              color: #ffc107;
            }
          }
        }

        .conflict-actions {
          display: flex;
          gap: 6px;
          margin-top: 4px;

          button {
            font-size: 10px;
            height: 24px;
            padding: 0 8px;

            mat-icon {
              font-size: 12px;
              width: 12px;
              height: 12px;
              margin-right: 2px;
            }
          }
        }
      }

      .pulse-indicator {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f44336;
        animation: pulse 1.5s infinite;
      }
    }

    @keyframes critical-pulse {
      0%, 100% {
        border-color: #f44336;
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
      }
      50% {
        border-color: #ff5252;
        box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.1);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.2);
      }
    }

    // Modo compacto
    .conflict-indicator.compact {
      padding: 4px 6px;

      .conflict-info {
        display: none;
      }

      .conflict-icon mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    // Modo inline para tablas
    .conflict-indicator.inline {
      background: none;
      border: none;
      padding: 0;
      gap: 4px;

      .conflict-icon mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .conflict-info {
        display: none;
      }

      &:hover .conflict-info {
        display: block;
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 200px;
      }
    }
  `]
})
export class ConflictIndicatorComponent {
  @Input() conflictType: ConflictType = 'MULTIPLE';
  @Input() message: string = '';
  @Input() affectedSessions: ClassSession[] = [];
  @Input() suggestions: string[] = [];
  @Input() severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  @Input() showInfo: boolean = true;
  @Input() showActions: boolean = true;
  @Input() compact: boolean = false;
  @Input() inline: boolean = false;

  @Output() resolveClicked = new EventEmitter<ConflictDetails>();
  @Output() detailsClicked = new EventEmitter<ConflictDetails>();

  constructor(private dialog: MatDialog) {}

  get conflictDetails(): ConflictDetails {
    return {
      type: this.conflictType,
      message: this.message,
      affectedSessions: this.affectedSessions,
      severity: this.severity,
      suggestions: this.suggestions
    };
  }

  getConflictIcon(): string {
    switch (this.conflictType) {
      case 'TEACHER':
        return 'person_off';
      case 'SPACE':
        return 'meeting_room_off';
      case 'GROUP':
        return 'group_off';
      case 'MULTIPLE':
        return 'error_outline';
      default:
        return 'warning';
    }
  }

  getConflictTitle(): string {
    switch (this.conflictType) {
      case 'TEACHER':
        return 'Conflicto de Docente';
      case 'SPACE':
        return 'Conflicto de Aula';
      case 'GROUP':
        return 'Conflicto de Grupo';
      case 'MULTIPLE':
        return 'Múltiples Conflictos';
      default:
        return 'Conflicto Detectado';
    }
  }

  getTooltipText(): string {
    let tooltip = `${this.getConflictTitle()}\n${this.message}`;

    if (this.affectedSessions.length > 0) {
      tooltip += `\n\nSesiones afectadas (${this.affectedSessions.length}):`;
      this.affectedSessions.slice(0, 3).forEach(session => {
        tooltip += `\n• ${this.getSessionDisplayText(session)}`;
      });

      if (this.affectedSessions.length > 3) {
        tooltip += `\n• ... y ${this.affectedSessions.length - 3} más`;
      }
    }

    if (this.suggestions.length > 0) {
      tooltip += '\n\nSugerencias:';
      this.suggestions.slice(0, 2).forEach(suggestion => {
        tooltip += `\n💡 ${suggestion}`;
      });
    }

    return tooltip;
  }

  getSessionDisplayText(session: ClassSession): string {
    return `${session.course.code} - ${session.teacher.fullName}`;
  }

  getSessionChipColor(session: ClassSession): string {
    // Color basado en el tipo de curso o prioridad
    const courseType = this.getCourseType(session);
    switch (courseType) {
      case 'THEORY':
        return 'primary';
      case 'PRACTICE':
        return 'warn';
      case 'MIXED':
        return 'accent';
      default:
        return 'default';
    }
  }

  private getCourseType(session: ClassSession): 'THEORY' | 'PRACTICE' | 'MIXED' {
    const hasTheory = session.course.weeklyTheoryHours > 0;
    const hasPractice = session.course.weeklyPracticeHours > 0;

    if (hasTheory && hasPractice) return 'MIXED';
    if (hasTheory) return 'THEORY';
    if (hasPractice) return 'PRACTICE';
    return 'THEORY';
  }

  canResolve(): boolean {
    // Determinar si el conflicto puede resolverse automáticamente
    return this.suggestions.length > 0 && this.severity !== 'CRITICAL';
  }

  resolveConflict(): void {
    this.resolveClicked.emit(this.conflictDetails);
  }

  showDetails(): void {
    this.detailsClicked.emit(this.conflictDetails);

    // También podríamos abrir un dialog con detalles
    // this.openConflictDetailsDialog();
  }

  private openConflictDetailsDialog(): void {
    // Implementar dialog de detalles del conflicto
    // const dialogRef = this.dialog.open(ConflictDetailsDialogComponent, {
    //   width: '600px',
    //   data: this.conflictDetails
    // });
  }
}
