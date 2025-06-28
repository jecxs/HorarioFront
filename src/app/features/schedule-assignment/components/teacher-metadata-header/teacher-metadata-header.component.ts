// src/app/features/schedule-assignment/components/teacher-metadata-header/teacher-metadata-header.component.ts
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
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

// Services y Models
import { TeacherMetadataService } from '../../services/teacher-metadata.service';
import { ExportService, ExportData } from '../../services/export.service';
import { TeacherScheduleMetadata, TeacherAssignmentStats } from '../../models/teacher-metadata.model';
import { TeacherResponse, DayOfWeek, DAY_NAMES, ClassSessionResponse } from '../../models/class-session.model';

@Component({
  selector: 'app-teacher-metadata-header',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <!-- src/app/features/schedule-assignment/components/teacher-metadata-header/teacher-metadata-header.component.html -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" [ngClass]="{'sticky top-4 z-30': isSticky}">

      <!-- Summary Bar -->
      <div class="summary-bar text-white p-4 flex items-center justify-between">
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <mat-icon class="text-white text-lg">schedule</mat-icon>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg leading-tight">{{ metadata?.totalAssignedHours || 0 }}</span>
              <span class="text-xs text-white/80 uppercase tracking-wide">Horas</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <mat-icon class="text-white text-lg">event</mat-icon>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg leading-tight">{{ metadata?.totalSessions || 0 }}</span>
              <span class="text-xs text-white/80 uppercase tracking-wide">Clases</span>
            </div>
          </div>

          <div class="w-12 h-12 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm progress-circle"
               [ngClass]="{'high-load': (metadata?.workloadPercentage || 0) > 80}">
            <span class="font-bold text-sm text-white">{{ metadata?.workloadPercentage || 0 }}%</span>
          </div>

          <div *ngIf="metadata?.availabilityHours" class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <mat-icon class="text-white text-lg">timelapse</mat-icon>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg leading-tight">{{ metadata?.availabilityHours }}</span>
              <span class="text-xs text-white/80 uppercase tracking-wide">Disponibles</span>
            </div>
          </div>
        </div>

        <!-- Actions and Toggle -->
        <div class="flex items-center space-x-3">
          <!-- ✅ NUEVO: Export Menu -->
          <div *ngIf="selectedTeacher && metadata && metadata.totalSessions > 0" class="export-section">
            <button
              mat-icon-button
              [matMenuTriggerFor]="exportMenu"
              class="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              [disabled]="isExporting"
              matTooltip="Exportar horario"
              matTooltipPosition="below">
              <mat-icon class="text-white" *ngIf="!isExporting">download</mat-icon>
              <mat-icon class="text-white animate-spin" *ngIf="isExporting">hourglass_empty</mat-icon>
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
          <button mat-icon-button
                  (click)="toggleExpanded()"
                  class="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <mat-icon class="text-white transition-transform duration-300" [ngClass]="{'rotated': isExpanded}">
              {{ isExpanded ? 'expand_less' : 'expand_more' }}
            </mat-icon>
          </button>
        </div>
      </div>

      <!-- Detailed View -->
      <div class="detailed-view" [ngClass]="{'expanded': isExpanded}">
        <div class="p-6">

          <!-- Stats Grid -->
          <div *ngIf="assignmentStats" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 stat-card workload">
              <div class="flex items-center space-x-2 mb-3">
                <mat-icon class="text-slate-600">person</mat-icon>
                <span class="font-medium text-slate-800">Carga de Trabajo</span>
              </div>
              <div class="space-y-2">
                <div class="space-y-2">
                  <span class="font-semibold text-slate-800">{{ assignmentStats.totalAssignedHours }}/{{ assignmentStats.totalAvailableHours }}h</span>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="assignmentStats.utilizationPercentage"
                    class="rounded-full h-2"
                    [ngClass]="{'high-utilization': assignmentStats.utilizationPercentage > 80}">
                  </mat-progress-bar>
                </div>
                <div class="text-sm text-slate-600">
                  <span class="font-medium">{{ assignmentStats.utilizationPercentage.toFixed(1) }}% de utilización</span>
                </div>
              </div>
            </div>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 stat-card distribution">
              <div class="flex items-center space-x-2 mb-3">
                <mat-icon class="text-slate-600">pie_chart</mat-icon>
                <span class="font-medium text-slate-800">Distribución</span>
              </div>
              <div class="space-y-2">
                <div class="flex items-center space-x-2 text-sm distribution-item theory">
                  <mat-icon class="text-base">menu_book</mat-icon>
                  <span class="font-medium">Teoría:</span>
                  <span class="text-slate-600">{{ assignmentStats.sessionsByType.theory }} clases ({{ assignmentStats.hoursByType.theory }}h)</span>
                </div>
                <div class="flex items-center space-x-2 text-sm distribution-item practice">
                  <mat-icon class="text-base">science</mat-icon>
                  <span class="font-medium">Práctica:</span>
                  <span class="text-slate-600">{{ assignmentStats.sessionsByType.practice }} clases ({{ assignmentStats.hoursByType.practice }}h)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Schedule Overview -->
          <div *ngIf="metadata" class="mb-6">
            <h4 class="flex items-center space-x-2 font-medium text-slate-800 mb-4">
              <mat-icon class="text-slate-600">date_range</mat-icon>
              <span>Distribución Semanal</span>
            </h4>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div *ngFor="let day of workingDays"
                   class="bg-white border border-slate-200 rounded-lg p-3 transition-all duration-200 day-card"
                   [ngClass]="{
                 'has-classes': getDaySessionCount(day) > 0,
                 'heavy-day': getDaySessionCount(day) > 3
               }">

                <div class="flex flex-col items-center mb-2">
                  <span class="font-medium text-slate-800 text-sm">{{ getDayName(day) }}</span>
                  <span *ngIf="getDaySessionCount(day) > 0" class="text-xs text-slate-600">
                {{ getDaySessionCount(day) }} clase{{ getDaySessionCount(day) > 1 ? 's' : '' }}
              </span>
                </div>

                <div *ngIf="getDayHours(day) > 0" class="flex items-center justify-center space-x-1 text-xs text-slate-600 mb-2">
                  <mat-icon class="text-base">schedule</mat-icon>
                  <span>{{ getDayHours(day) }}h</span>
                </div>

                <!-- Sessions preview -->
                <div *ngIf="getDaySessionCount(day) > 0" class="space-y-1">
                  <div *ngFor="let session of getDaySessions(day).slice(0, 2)"
                       class="bg-white rounded p-2 text-xs border session-preview"
                       [ngClass]="{
                     'theory': session.sessionType.name === 'THEORY',
                     'practice': session.sessionType.name === 'PRACTICE'
                   }">
                    <span class="font-medium text-slate-800 block truncate">{{ getShortCourseName(session.course.name) }}</span>
                    <span class="text-slate-600">{{ session.studentGroup.name }}</span>
                  </div>
                  <div *ngIf="getDaySessionCount(day) > 2" class="text-xs text-slate-500 text-center py-1">
                    +{{ getDaySessionCount(day) - 2 }} más
                  </div>
                </div>

                <div *ngIf="getDaySessionCount(day) === 0" class="flex flex-col items-center justify-center text-slate-400 py-2">
                  <mat-icon class="text-lg mb-1">event_available</mat-icon>
                  <span class="text-xs">Sin clases</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Teacher Info -->
          <div *ngIf="selectedTeacher" class="mb-6">
            <h4 class="flex items-center space-x-2 font-medium text-slate-800 mb-4">
              <mat-icon class="text-slate-600">person</mat-icon>
              <span>Información del Docente</span>
            </h4>

            <div class="space-y-3">
              <div class="flex items-start space-x-3">
                <span class="font-medium text-slate-700 min-w-0 flex-shrink-0 w-40">Departamento:</span>
                <span class="text-slate-600">{{ selectedTeacher.department.name }}</span>
              </div>

              <div class="flex items-start space-x-3">
                <span class="font-medium text-slate-700 min-w-0 flex-shrink-0 w-40">Áreas de conocimiento:</span>
                <div class="flex-1">
                  <mat-chip-set class="flex flex-wrap gap-2">
                    <mat-chip *ngFor="let area of selectedTeacher.knowledgeAreas" class="knowledge-chip">
                      {{ area.name }}
                    </mat-chip>
                  </mat-chip-set>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <span class="font-medium text-slate-700 min-w-0 flex-shrink-0 w-40">Estado de cuenta:</span>
                <span class="text-slate-600 flex items-center space-x-2" [ngClass]="{'has-account': selectedTeacher.hasUserAccount}">
              <mat-icon class="text-base">{{ selectedTeacher.hasUserAccount ? 'verified_user' : 'account_circle' }}</mat-icon>
              <span>{{ selectedTeacher.hasUserAccount ? 'Cuenta activa' : 'Sin cuenta' }}</span>
            </span>
              </div>
            </div>
          </div>

          <!-- Suggestions -->
          <div *ngIf="suggestions && suggestions.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 class="flex items-center space-x-2 font-medium text-yellow-800 mb-3">
              <mat-icon class="text-yellow-600">lightbulb</mat-icon>
              <span>Sugerencias</span>
            </h4>
            <div class="space-y-2">
              <div *ngFor="let suggestion of suggestions" class="flex items-start space-x-2 text-sm text-yellow-700">
                <mat-icon class="text-yellow-600 mt-0.5 flex-shrink-0">arrow_forward</mat-icon>
                <span>{{ suggestion }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./teacher-metadata-header.component.scss']
})
export class TeacherMetadataHeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private metadataService = inject(TeacherMetadataService);
  private exportService = inject(ExportService);
  private snackBar = inject(MatSnackBar);

  @Input() isSticky = false;
  @Input() selectedTeacher: TeacherResponse | null = null;
  @Input() sessions: ClassSessionResponse[] = []; // ✅ NUEVO: Para exportación

  // State
  metadata: TeacherScheduleMetadata | null = null;
  assignmentStats: TeacherAssignmentStats | null = null;
  suggestions: string[] = [];
  isExpanded = false;
  isExporting = false; // ✅ NUEVO: Estado de exportación

  workingDays = Object.values(DayOfWeek).filter(d => d !== DayOfWeek.SUNDAY);

  ngOnInit(): void {
    // Suscribirse a cambios en los metadatos
    this.metadataService.teacherScheduleMetadata$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metadata => {
        this.metadata = metadata;
        console.log('📊 Teacher metadata updated:', metadata);
      });

    // Suscribirse a estadísticas
    this.metadataService.getTeacherAssignmentStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.assignmentStats = stats;
      });

    // Suscribirse a sugerencias
    this.metadataService.getTeacherSuggestions()
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
    if (!this.selectedTeacher || !this.metadata) {
      this.showSnackBar('No hay datos del docente para exportar', 'warning');
      return;
    }

    try {
      this.isExporting = true;
      console.log('🖨️ Starting PDF export for teacher:', this.selectedTeacher.fullName);

      const exportData: ExportData = {
        title: 'Horario de Clases',
        subtitle: `Docente: ${this.selectedTeacher.fullName}`,
        entity: this.selectedTeacher,
        sessions: this.sessions,
        exportType: 'teacher',
        metadata: {
          totalHours: this.metadata.totalAssignedHours,
          totalSessions: this.metadata.totalSessions,
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
    if (!this.selectedTeacher || !this.metadata) {
      this.showSnackBar('No hay datos del docente para exportar', 'warning');
      return;
    }

    try {
      this.isExporting = true;
      console.log('📊 Starting Excel export for teacher:', this.selectedTeacher.fullName);

      const exportData: ExportData = {
        title: 'Horario de Clases',
        subtitle: `Docente: ${this.selectedTeacher.fullName}`,
        entity: this.selectedTeacher,
        sessions: this.sessions,
        exportType: 'teacher',
        metadata: {
          totalHours: this.metadata.totalAssignedHours,
          totalSessions: this.metadata.totalSessions,
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

  getDayName(day: DayOfWeek): string {
    return DAY_NAMES[day];
  }

  getDaySessionCount(day: DayOfWeek): number {
    if (!this.metadata) return 0;
    return this.metadata.sessionsByDay[day]?.length || 0;
  }

  getDayHours(day: DayOfWeek): number {
    if (!this.metadata) return 0;
    const sessions = this.metadata.sessionsByDay[day] || [];
    return sessions.reduce((sum, session) => sum + session.totalHours, 0);
  }

  getDaySessions(day: DayOfWeek) {
    if (!this.metadata) return [];
    return this.metadata.sessionsByDay[day] || [];
  }

  getShortCourseName(courseName: string): string {
    if (!courseName) return '';
    const words = courseName.split(' ');
    if (words.length <= 2) return courseName;
    return words.slice(0, 2).join(' ') + '...';
  }
}
