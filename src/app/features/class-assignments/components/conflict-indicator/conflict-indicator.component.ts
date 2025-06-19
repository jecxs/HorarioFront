// src/app/features/class-assignments/components/conflict-indicator/conflict-indicator.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

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
    MatDialogModule,
    MatCardModule,
    MatListModule,
    MatDividerModule
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
        <div class="severity-indicator">
          <mat-chip [color]="getSeverityColor()" size="small">
            {{ getSeverityText() }}
          </mat-chip>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./conflict-indicator.component.scss']
})
export class ConflictIndicatorComponent implements OnInit {
  @Input() conflictDetails!: ConflictDetails;
  @Input() showInfo: boolean = false;
  @Input() clickable: boolean = true;

  @Output() conflictClick = new EventEmitter<ConflictDetails>();
  @Output() resolveAttempt = new EventEmitter<ConflictDetails>();

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    if (!this.conflictDetails) {
      // Crear datos de conflicto por defecto para testing
      this.conflictDetails = {
        type: 'MULTIPLE',
        message: 'Conflicto de horario detectado',
        affectedSessions: [],
        severity: 'HIGH',
        suggestions: ['Revisar asignaciones', 'Cambiar horario']
      };
    }
  }

  getConflictIcon(): string {
    switch (this.conflictDetails.type) {
      case 'TEACHER':
        return 'person_off';
      case 'SPACE':
        return 'room_service';
      case 'GROUP':
        return 'group_off';
      case 'MULTIPLE':
        return 'warning';
      default:
        return 'error';
    }
  }

  getConflictTitle(): string {
    switch (this.conflictDetails.type) {
      case 'TEACHER':
        return 'Conflicto de Docente';
      case 'SPACE':
        return 'Conflicto de Aula';
      case 'GROUP':
        return 'Conflicto de Grupo';
      case 'MULTIPLE':
        return 'Conflictos Múltiples';
      default:
        return 'Conflicto Detectado';
    }
  }

  getSeverityColor(): string {
    switch (this.conflictDetails.severity) {
      case 'LOW':
        return 'primary';
      case 'MEDIUM':
        return 'accent';
      case 'HIGH':
        return 'warn';
      case 'CRITICAL':
        return 'warn';
      default:
        return 'warn';
    }
  }

  getSeverityText(): string {
    switch (this.conflictDetails.severity) {
      case 'LOW':
        return 'Bajo';
      case 'MEDIUM':
        return 'Medio';
      case 'HIGH':
        return 'Alto';
      case 'CRITICAL':
        return 'Crítico';
      default:
        return 'Desconocido';
    }
  }

  getTooltipText(): string {
    let tooltip = `${this.getConflictTitle()}\n`;
    tooltip += `Severidad: ${this.getSeverityText()}\n`;
    tooltip += `${this.conflictDetails.message}\n`;

    if (this.conflictDetails.affectedSessions.length > 0) {
      tooltip += `\nSesiones afectadas: ${this.conflictDetails.affectedSessions.length}`;
    }

    if (this.conflictDetails.suggestions.length > 0) {
      tooltip += `\n\nSugerencias:\n• ${this.conflictDetails.suggestions.join('\n• ')}`;
    }

    return tooltip;
  }

  showDetails(): void {
    if (!this.clickable) return;

    this.conflictClick.emit(this.conflictDetails);

    const dialogRef = this.dialog.open(ConflictDetailsDialogComponent, {
      width: '600px',
      data: this.conflictDetails
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'resolve') {
        this.resolveAttempt.emit(this.conflictDetails);
      }
    });
  }
}

// ====== DIALOG COMPONENT ======

@Component({
  selector: 'app-conflict-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">{{ getConflictIcon() }}</mat-icon>
      Detalles del Conflicto
    </h2>

    <mat-dialog-content>
      <div class="conflict-details">
        <!-- Información general -->
        <mat-card class="conflict-summary">
          <mat-card-header>
            <mat-card-title>{{ getConflictTitle() }}</mat-card-title>
            <mat-card-subtitle>
              <mat-chip [color]="getSeverityColor()" size="small">
                <mat-icon>{{ getSeverityIcon() }}</mat-icon>
                {{ getSeverityText() }}
              </mat-chip>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>{{ data.message }}</p>
          </mat-card-content>
        </mat-card>

        <!-- Sesiones afectadas -->
        <mat-card class="affected-sessions" *ngIf="data.affectedSessions.length > 0">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>list</mat-icon>
              Sesiones Afectadas ({{ data.affectedSessions.length }})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item *ngFor="let session of data.affectedSessions">
                <mat-icon matListItemIcon>class</mat-icon>
                <div matListItemTitle>{{ session.course.name }}</div>
                <div matListItemLine>
                  <span class="session-details">
                    {{ session.teacher.firstName }} {{ session.teacher.lastName }} •
                    {{ session.learningSpace.name }} •
                    {{ session.studentGroup.name }}
                  </span>
                </div>
                <mat-chip matListItemMeta
                         [color]="session.sessionType.name === 'PRACTICE' ? 'warn' : 'primary'"
                         size="small">
                  {{ session.sessionType.name === 'PRACTICE' ? 'Práctica' : 'Teoría' }}
                </mat-chip>
              </mat-list-item>
              <mat-divider *ngIf="data.affectedSessions.length > 1"></mat-divider>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <!-- Sugerencias de resolución -->
        <mat-card class="suggestions" *ngIf="data.suggestions.length > 0">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>lightbulb</mat-icon>
              Sugerencias para Resolver
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item *ngFor="let suggestion of data.suggestions">
                <mat-icon matListItemIcon color="accent">arrow_forward</mat-icon>
                <div matListItemTitle>{{ suggestion }}</div>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <!-- Acciones recomendadas -->
        <mat-card class="recommended-actions">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>build</mat-icon>
              Acciones Recomendadas
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="resolveConflict()">
                <mat-icon>auto_fix_high</mat-icon>
                Resolver Automáticamente
              </button>

              <button mat-stroked-button (click)="editSession()">
                <mat-icon>edit</mat-icon>
                Editar Sesión
              </button>

              <button mat-stroked-button (click)="showAlternatives()">
                <mat-icon>compare_arrows</mat-icon>
                Ver Alternativas
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
      <button mat-raised-button
              color="warn"
              [mat-dialog-close]="{ action: 'resolve' }"
              *ngIf="canAutoResolve()">
        <mat-icon>auto_fix_high</mat-icon>
        Resolver
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .conflict-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 100%;

      mat-card {
        margin: 0;

        mat-card-header {
          mat-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;
          }
        }
      }

      .conflict-summary {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border-left: 4px solid #ff9800;
      }

      .affected-sessions {
        .session-details {
          font-size: 0.9rem;
          color: #666;
        }
      }

      .suggestions {
        background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
        border-left: 4px solid #4caf50;
      }

      .recommended-actions {
        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;

          button {
            min-width: 140px;
          }
        }
      }
    }
  `]
})
export class ConflictDetailsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConflictDetails,
    private dialogRef: MatDialogRef<ConflictDetailsDialogComponent>
  ) {}

  getConflictIcon(): string {
    switch (this.data.type) {
      case 'TEACHER': return 'person_off';
      case 'SPACE': return 'room_service';
      case 'GROUP': return 'group_off';
      case 'MULTIPLE': return 'warning';
      default: return 'error';
    }
  }

  getConflictTitle(): string {
    switch (this.data.type) {
      case 'TEACHER': return 'Conflicto de Docente';
      case 'SPACE': return 'Conflicto de Aula';
      case 'GROUP': return 'Conflicto de Grupo';
      case 'MULTIPLE': return 'Conflictos Múltiples';
      default: return 'Conflicto Detectado';
    }
  }

  getSeverityColor(): string {
    switch (this.data.severity) {
      case 'LOW': return 'primary';
      case 'MEDIUM': return 'accent';
      case 'HIGH': return 'warn';
      case 'CRITICAL': return 'warn';
      default: return 'warn';
    }
  }

  getSeverityText(): string {
    switch (this.data.severity) {
      case 'LOW': return 'Bajo';
      case 'MEDIUM': return 'Medio';
      case 'HIGH': return 'Alto';
      case 'CRITICAL': return 'Crítico';
      default: return 'Desconocido';
    }
  }

  getSeverityIcon(): string {
    switch (this.data.severity) {
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'dangerous';
      default: return 'help';
    }
  }

  canAutoResolve(): boolean {
    return this.data.severity !== 'CRITICAL' && this.data.suggestions.length > 0;
  }

  resolveConflict(): void {
    this.dialogRef.close({ action: 'resolve' });
  }

  editSession(): void {
    this.dialogRef.close({ action: 'edit' });
  }

  showAlternatives(): void {
    this.dialogRef.close({ action: 'alternatives' });
  }
}

// Required imports for dialog
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
