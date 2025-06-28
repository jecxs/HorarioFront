// src/app/features/schedule-assignment/components/course-metadata-header/course-metadata-header.component.ts
import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

// Services y Models
import { CourseMetadataService } from '../../services/course-metadata.service';
import { ExportService, ExportData } from '../../services/export.service';
import { GroupCoursesSummary, CourseMetadata, CourseAssignmentStats } from '../../models/course-metadata.model';
import { StudentGroupResponse, ClassSessionResponse } from '../../models/class-session.model';

@Component({
  selector: 'app-course-metadata-header',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatExpansionModule,
    MatDividerModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <div class="metadata-header-container" [class.sticky]="isSticky">

      <!-- Compact Summary Bar -->
      <div class="summary-bar">
        <div class="summary-section">
          <div class="summary-item">
            <mat-icon class="summary-icon">book</mat-icon>
            <div class="summary-content">
              <span class="summary-value">{{ summary?.totalCourses || 0 }}</span>
              <span class="summary-label">Cursos</span>
            </div>
          </div>

          <div class="summary-item">
            <mat-icon class="summary-icon" [class.completed]="(summary?.overallProgress || 0) === 100">schedule</mat-icon>
            <div class="summary-content">
              <span class="summary-value">{{ summary?.totalAssignedHours || 0 }}/{{ summary?.totalRequiredHours || 0 }}</span>
              <span class="summary-label">Horas</span>
            </div>
          </div>

          <div class="summary-item">
            <div class="progress-circle" [class.completed]="(summary?.overallProgress || 0) === 100">
              <span class="progress-value">{{ summary?.overallProgress || 0 }}%</span>
            </div>
          </div>

          <div class="summary-item urgent" *ngIf="(summary?.totalRemainingHours || 0) > 0">
            <mat-icon class="summary-icon pending">warning</mat-icon>
            <div class="summary-content">
              <span class="summary-value urgent">{{ summary?.totalRemainingHours || 0 }}</span>
              <span class="summary-label">Pendientes</span>
            </div>
          </div>
        </div>

        <!-- Actions and Toggle -->
        <div class="actions-section">
          <!-- ✅ NUEVO: Export Menu -->
          <div *ngIf="selectedGroup && summary && summary.totalAssignedHours > 0" class="export-section">
            <button
              mat-icon-button
              [matMenuTriggerFor]="exportMenu"
              class="export-btn"
              [disabled]="isExporting"
              matTooltip="Exportar horario del grupo"
              matTooltipPosition="below">
              <mat-icon *ngIf="!isExporting">download</mat-icon>
              <mat-icon class="animate-spin" *ngIf="isExporting">hourglass_empty</mat-icon>
            </button>

            <mat-menu #exportMenu="matMenu" class="export-menu">
              <button mat-menu-item (click)="exportToPDF()" [disabled]="isExporting">
                <mat-icon color="primary">picture_as_pdf</mat-icon>
                <span>Exportar a PDF</span>
                <span class="export-hint">Formato imprimible</span>
              </button>
              <button mat-menu-item (click)="exportToExcel()" [disabled]="isExporting">
                <mat-icon color="accent">table_chart</mat-icon>
                <span>Exportar a Excel</span>
                <span class="export-hint">Para análisis y edición</span>
              </button>
            </mat-menu>
          </div>

          <!-- Toggle Button -->
          <button mat-icon-button (click)="toggleExpanded()" class="toggle-btn">
            <mat-icon [class.rotated]="isExpanded">{{ isExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Detailed View (Expandible) -->
      <div class="detailed-view" [class.expanded]="isExpanded">

        <!-- Quick Stats -->
        <div class="stats-grid" *ngIf="assignmentStats">
          <div class="stat-card theory">
            <div class="stat-header">
              <mat-icon>menu_book</mat-icon>
              <span>Teoría</span>
            </div>
            <div class="stat-content">
              <div class="stat-progress">
                <span class="stat-value">{{ assignmentStats.assignedTheoryHours }}/{{ assignmentStats.totalTheoryHours }}</span>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getTheoryProgressPercentage()"
                  class="theory-progress">
                </mat-progress-bar>
              </div>
              <div class="stat-remaining" *ngIf="assignmentStats.remainingTheoryHours > 0">
                <span class="remaining-hours">{{ assignmentStats.remainingTheoryHours }}h pendientes</span>
              </div>
            </div>
          </div>

          <div class="stat-card practice">
            <div class="stat-header">
              <mat-icon>science</mat-icon>
              <span>Práctica</span>
            </div>
            <div class="stat-content">
              <div class="stat-progress">
                <span class="stat-value">{{ assignmentStats.assignedPracticeHours }}/{{ assignmentStats.totalPracticeHours }}</span>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getPracticeProgressPercentage()"
                  class="practice-progress">
                </mat-progress-bar>
              </div>
              <div class="stat-remaining" *ngIf="assignmentStats.remainingPracticeHours > 0">
                <span class="remaining-hours">{{ assignmentStats.remainingPracticeHours }}h pendientes</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Courses List -->
        <div class="courses-grid">
          <div
            *ngFor="let courseMetadata of summary?.courses; trackBy: trackByCourse"
            class="course-card"
            [class.completed]="courseMetadata.isCompleted"
            [class.priority]="courseMetadata.remainingHours > 4"
            [class.urgent]="shouldHighlightCourse(courseMetadata)">

            <div class="course-header">
              <div class="course-info">
                <h4 class="course-name" [matTooltip]="courseMetadata.course.name">
                  {{ courseMetadata.course.name }}
                </h4>
                <span class="course-code">{{ courseMetadata.course.code }}</span>
              </div>

              <div class="course-status">
                <mat-chip-set>
                  <mat-chip class="status-chip" [class.completed]="courseMetadata.isCompleted">
                    {{ courseMetadata.isCompleted ? 'Completo' : 'Pendiente' }}
                  </mat-chip>
                  <mat-chip
                    *ngIf="courseMetadata.sessionsCount > 0"
                    class="sessions-chip"
                    [matTooltip]="courseMetadata.sessionsCount + ' sesiones asignadas'">
                    {{ courseMetadata.sessionsCount }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>

            <div class="course-progress">
              <div class="progress-info">
                <span class="progress-text">
                  {{ courseMetadata.assignedHours }}/{{ courseMetadata.totalRequiredHours }} horas
                </span>
                <span class="progress-percentage">{{ courseMetadata.progressPercentage }}%</span>
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="courseMetadata.progressPercentage"
                [class.completed]="courseMetadata.isCompleted">
              </mat-progress-bar>
            </div>

            <div class="course-details">
              <!-- Theory Hours -->
              <div class="hour-type theory" *ngIf="courseMetadata.requiredTheoryHours > 0">
                <div class="hour-icon">
                  <mat-icon>menu_book</mat-icon>
                </div>
                <div class="hour-info">
                  <span class="hour-label">Teoría:</span>
                  <span class="hour-value">
                    {{ courseMetadata.assignedTheoryHours }}/{{ courseMetadata.requiredTheoryHours }}h
                  </span>
                  <span
                    *ngIf="courseMetadata.remainingTheoryHours > 0"
                    class="hour-remaining">
                    (faltan {{ courseMetadata.remainingTheoryHours }}h)
                  </span>
                </div>
              </div>

              <!-- Practice Hours -->
              <div class="hour-type practice" *ngIf="courseMetadata.requiredPracticeHours > 0">
                <div class="hour-icon">
                  <mat-icon>science</mat-icon>
                </div>
                <div class="hour-info">
                  <span class="hour-label">Práctica:</span>
                  <span class="hour-value">
                    {{ courseMetadata.assignedPracticeHours }}/{{ courseMetadata.requiredPracticeHours }}h
                  </span>
                  <span
                    *ngIf="courseMetadata.remainingPracticeHours > 0"
                    class="hour-remaining">
                    (faltan {{ courseMetadata.remainingPracticeHours }}h)
                  </span>
                </div>
              </div>
            </div>

            <!-- Preferred Specialty -->
            <div
              *ngIf="courseMetadata.course.preferredSpecialty"
              class="course-specialty">
              <mat-icon class="specialty-icon">science</mat-icon>
              <span class="specialty-text">{{ courseMetadata.course.preferredSpecialty.name }}</span>
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div class="suggestions-section" *ngIf="suggestions && suggestions.length > 0">
          <h4 class="suggestions-title">
            <mat-icon>lightbulb</mat-icon>
            Sugerencias
          </h4>
          <div class="suggestions-list">
            <div *ngFor="let suggestion of suggestions" class="suggestion-item">
              <mat-icon class="suggestion-icon">arrow_forward</mat-icon>
              <span>{{ suggestion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./course-metadata-header.component.scss']
})
export class CourseMetadataHeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private metadataService = inject(CourseMetadataService);
  private exportService = inject(ExportService);
  private snackBar = inject(MatSnackBar);

  @Input() isSticky = false;
  @Input() selectedGroup: StudentGroupResponse | null = null;
  @Input() sessions: ClassSessionResponse[] = []; // ✅ NUEVO: Para exportación

  // State
  summary: GroupCoursesSummary | null = null;
  assignmentStats: CourseAssignmentStats | null = null;
  suggestions: string[] = [];
  isExpanded = false;
  isExporting = false; // ✅ NUEVO: Estado de exportación

  ngOnInit(): void {
    // Suscribirse a cambios en los metadatos
    this.metadataService.groupCoursesSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.summary = summary;
        console.log('📊 Metadata updated:', summary);
      });

    // Suscribirse a estadísticas de asignación
    this.metadataService.getAssignmentStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.assignmentStats = stats;
      });

    // Suscribirse a sugerencias
    this.metadataService.getAssignmentSuggestions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(suggestions => {
        this.suggestions = suggestions;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  // ===== MÉTODOS DE EXPORTACIÓN =====

  async exportToPDF(): Promise<void> {
    if (!this.selectedGroup || !this.summary) {
      this.showSnackBar('No hay datos del grupo para exportar', 'warning');
      return;
    }

    try {
      this.isExporting = true;
      console.log('🖨️ Starting PDF export for group:', this.selectedGroup.name);

      const exportData: ExportData = {
        title: 'Horario de Clases',
        subtitle: `Grupo: ${this.selectedGroup.name} - Ciclo ${this.selectedGroup.cycleNumber}`,
        entity: this.selectedGroup,
        sessions: this.sessions,
        exportType: 'group',
        metadata: {
          totalHours: this.summary.totalAssignedHours,
          totalSessions: this.sessions.length,
          periodName: this.selectedGroup.periodName,
          generatedAt: new Date(),
          generatedBy: 'Sistema de Gestión de Horarios'
        }
      };

      await this.exportService.exportToPDF(exportData);
      this.showSnackBar('Horario exportado a PDF exitosamente', 'success');

    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      this.showSnackBar('Error al exportar a PDF', 'error');
    } finally {
      this.isExporting = false;
    }
  }

  async exportToExcel(): Promise<void> {
    if (!this.selectedGroup || !this.summary) {
      this.showSnackBar('No hay datos del grupo para exportar', 'warning');
      return;
    }

    try {
      this.isExporting = true;
      console.log('📊 Starting Excel export for group:', this.selectedGroup.name);

      const exportData: ExportData = {
        title: 'Horario de Clases',
        subtitle: `Grupo: ${this.selectedGroup.name} - Ciclo ${this.selectedGroup.cycleNumber}`,
        entity: this.selectedGroup,
        sessions: this.sessions,
        exportType: 'group',
        metadata: {
          totalHours: this.summary.totalAssignedHours,
          totalSessions: this.sessions.length,
          periodName: this.selectedGroup.periodName,
          generatedAt: new Date(),
          generatedBy: 'Sistema de Gestión de Horarios'
        }
      };

      await this.exportService.exportToExcel(exportData);
      this.showSnackBar('Horario exportado a Excel exitosamente', 'success');

    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      this.showSnackBar('Error al exportar a Excel', 'error');
    } finally {
      this.isExporting = false;
    }
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }

  // ===== MÉTODOS EXISTENTES =====

  trackByCourse(index: number, courseMetadata: CourseMetadata): string {
    return courseMetadata.course.uuid;
  }

  shouldHighlightCourse(courseMetadata: CourseMetadata): boolean {
    // Destacar cursos con muchas horas pendientes o que son críticos
    return courseMetadata.remainingHours > 0 && (
      courseMetadata.remainingHours >= 4 ||
      courseMetadata.progressPercentage === 0
    );
  }

  getTheoryProgressPercentage(): number {
    if (!this.assignmentStats || this.assignmentStats.totalTheoryHours === 0) return 0;
    return (this.assignmentStats.assignedTheoryHours / this.assignmentStats.totalTheoryHours) * 100;
  }

  getPracticeProgressPercentage(): number {
    if (!this.assignmentStats || this.assignmentStats.totalPracticeHours === 0) return 0;
    return (this.assignmentStats.assignedPracticeHours / this.assignmentStats.totalPracticeHours) * 100;
  }
}
