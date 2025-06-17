// src/app/features/class-assignments/components/teacher-selector/teacher-selector.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// Services
import { Teacher, TeacherAvailability, ClassAssignmentService } from '../../services/class-assignment.service';

@Component({
  selector: 'app-teacher-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatCheckboxModule,
    MatSlideToggleModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TeacherSelectorComponent),
      multi: true
    }
  ],
  template: `
    <div class="teacher-selector">
      <!-- Filtros y búsqueda -->
      <div class="selector-header">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar docente</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Nombre, email o área..."
            autocomplete="off">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="filter-options">
          <mat-slide-toggle
            [checked]="showOnlyAvailable"
            (change)="toggleAvailabilityFilter($event.checked)"
            color="primary">
            Solo disponibles
          </mat-slide-toggle>

          <mat-slide-toggle
            [checked]="showCompatibilityScore"
            (change)="toggleCompatibilityScore($event.checked)"
            color="accent">
            Puntuación
          </mat-slide-toggle>
        </div>
      </div>

      <!-- Lista de docentes -->
      <div class="teachers-list" [class.loading]="loading">
        <div class="loading-overlay" *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando docentes...</span>
        </div>

        <div class="no-teachers" *ngIf="!loading && filteredTeachers.length === 0">
          <mat-icon>person_off</mat-icon>
          <span>No se encontraron docentes con los criterios seleccionados</span>
        </div>

        <div
          class="teacher-card"
          *ngFor="let teacher of filteredTeachers; trackBy: trackByTeacherId"
          [class.selected]="isSelected(teacher)"
          [class.compatible]="isCompatible(teacher)"
          [class.available]="isAvailable(teacher)"
          (click)="selectTeacher(teacher)">

          <!-- Header del docente -->
          <div class="teacher-header">
            <div class="teacher-avatar">
              <mat-icon>person</mat-icon>
            </div>

            <div class="teacher-info">
              <h4 class="teacher-name">{{ teacher.fullName }}</h4>
              <p class="teacher-email">{{ teacher.email }}</p>
            </div>

            <div class="teacher-indicators">
              <!-- Indicador de compatibilidad -->
              <mat-icon
                *ngIf="isCompatible(teacher)"
                class="compatibility-icon"
                matTooltip="Compatible con el área de conocimiento requerida"
                color="primary">
                verified
              </mat-icon>

              <!-- Indicador de disponibilidad -->
              <mat-icon
                *ngIf="isAvailable(teacher)"
                class="availability-icon"
                matTooltip="Disponible en el horario seleccionado"
                color="accent">
                schedule
              </mat-icon>

              <!-- Puntuación de compatibilidad -->
              <div
                class="compatibility-score"
                *ngIf="showCompatibilityScore"
                matTooltip="Puntuación de compatibilidad">
                <span class="score-value">{{ getCompatibilityScore(teacher) }}%</span>
              </div>

              <!-- Checkbox de selección -->
              <mat-checkbox
                [checked]="isSelected(teacher)"
                (change)="$event.stopPropagation(); selectTeacher(teacher)"
                color="primary">
              </mat-checkbox>
            </div>
          </div>

          <!-- Información detallada -->
          <div class="teacher-details">
            <div class="detail-section">
              <div class="department-info">
                <mat-icon>business</mat-icon>
                <span>{{ teacher.department.name }}</span>
                <mat-chip *ngIf="teacher.department.code">{{ teacher.department.code }}</mat-chip>
              </div>
            </div>

            <div class="detail-section">
              <div class="knowledge-areas">
                <mat-icon>school</mat-icon>
                <div class="areas-list">
                  <mat-chip
                    *ngFor="let area of teacher.knowledgeAreas"
                    [color]="isAreaCompatible(area) ? 'primary' : 'default'"
                    [class.required-area]="isAreaCompatible(area)">
                    {{ area.name }}
                  </mat-chip>
                </div>
              </div>
            </div>

            <div class="detail-section" *ngIf="selectedDay">
              <div class="availability-info">
                <mat-icon>access_time</mat-icon>
                <div class="availability-details">
                  <span class="availability-label">Disponibilidad {{ dayLabel }}:</span>
                  <div class="availability-blocks">
                    <div
                      class="availability-block"
                      *ngFor="let availability of getTeacherDayAvailability(teacher)"
                      matTooltip="{{ availability.startTime }} - {{ availability.endTime }}">
                      <span class="block-time">{{ formatTimeRange(availability.startTime, availability.endTime) }}</span>
                    </div>
                    <div class="no-availability" *ngIf="getTeacherDayAvailability(teacher).length === 0">
                      <span>Sin disponibilidad registrada</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Estadísticas del docente -->
            <div class="detail-section">
              <div class="teacher-stats">
                <div class="stat-item">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ teacher.totalAvailabilities }} bloques disponibles</span>
                </div>
                <div class="stat-item" *ngIf="getTeacherWorkload(teacher) !== null">
                  <mat-icon>assignment</mat-icon>
                  <span>{{ getTeacherWorkload(teacher) }} sesiones asignadas</span>
                </div>
                <div class="stat-item" *ngIf="teacher.hasUserAccount">
                  <mat-icon>account_circle</mat-icon>
                  <span>Cuenta activa</span>
                </div>
              </div>
            </div>

            <!-- Acciones rápidas -->
            <div class="teacher-actions" *ngIf="isSelected(teacher)">
              <mat-divider></mat-divider>
              <div class="actions-row">
                <button
                  mat-stroked-button
                  size="small"
                  (click)="$event.stopPropagation(); viewTeacherSchedule(teacher)">
                  <mat-icon>calendar_view_week</mat-icon>
                  Ver Horario
                </button>
                <button
                  mat-stroked-button
                  size="small"
                  (click)="$event.stopPropagation(); viewTeacherAvailability(teacher)">
                  <mat-icon>access_time</mat-icon>
                  Disponibilidad
                </button>
              </div>
            </div>
          </div>

          <!-- Overlay de selección -->
          <div class="selection-overlay" *ngIf="isSelected(teacher)">
            <mat-icon>check_circle</mat-icon>
          </div>
        </div>
      </div>

      <!-- Panel de ayuda contextual -->
      <div class="help-panel" *ngIf="showHelp">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>help</mat-icon>
              Consejos de Selección
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <ul class="help-list">
              <li>
                <mat-icon>verified</mat-icon>
                Los docentes con <strong>verificado</strong> tienen el área de conocimiento requerida
              </li>
              <li>
                <mat-icon>schedule</mat-icon>
                Los docentes con <strong>reloj</strong> están disponibles en el horario seleccionado
              </li>
              <li>
                <mat-icon>search</mat-icon>
                Usa la búsqueda para filtrar por nombre, email o área de conocimiento
              </li>
              <li>
                <mat-icon>tune</mat-icon>
                Activa "Solo disponibles" para ver únicamente docentes libres
              </li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .teacher-selector {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .selector-header {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;

        .search-field {
          flex: 1;
          max-width: 300px;
        }

        .filter-options {
          display: flex;
          gap: 16px;
          align-items: center;
        }
      }

      .teachers-list {
        position: relative;
        max-height: 500px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 8px;

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

        .no-teachers {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
          gap: 8px;

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            opacity: 0.5;
          }
        }

        .teacher-card {
          position: relative;
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
          transition: all 0.2s ease;

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background: #f5f5f5;
          }

          &.selected {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
          }

          &.compatible {
            border-left: 4px solid #4caf50;
          }

          &.available {
            background: #f1f8e9;
          }

          .teacher-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;

            .teacher-avatar {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: #e0e0e0;
              display: flex;
              align-items: center;
              justify-content: center;

              mat-icon {
                color: #666;
              }
            }

            .teacher-info {
              flex: 1;

              .teacher-name {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 500;
                color: #333;
              }

              .teacher-email {
                margin: 0;
                font-size: 12px;
                color: #666;
              }
            }

            .teacher-indicators {
              display: flex;
              align-items: center;
              gap: 8px;

              .compatibility-icon {
                color: #4caf50;
              }

              .availability-icon {
                color: #ff9800;
              }

              .compatibility-score {
                background: #2196f3;
                color: white;
                border-radius: 12px;
                padding: 4px 8px;
                font-size: 10px;
                font-weight: 600;

                .score-value {
                  font-size: 11px;
                }
              }
            }
          }

          .teacher-details {
            .detail-section {
              margin-bottom: 12px;

              &:last-child {
                margin-bottom: 0;
              }

              .department-info, .knowledge-areas, .availability-info, .teacher-stats {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-size: 12px;

                mat-icon {
                  font-size: 16px;
                  width: 16px;
                  height: 16px;
                  color: #666;
                  margin-top: 2px;
                }
              }

              .knowledge-areas {
                .areas-list {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;

                  mat-chip {
                    font-size: 10px;
                    height: 20px;

                    &.required-area {
                      font-weight: 600;
                    }
                  }
                }
              }

              .availability-info {
                flex-direction: column;
                align-items: flex-start;

                .availability-details {
                  margin-left: 24px;
                  width: 100%;

                  .availability-label {
                    font-weight: 500;
                    color: #333;
                    display: block;
                    margin-bottom: 4px;
                  }

                  .availability-blocks {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;

                    .availability-block {
                      background: #e8f5e8;
                      border: 1px solid #4caf50;
                      border-radius: 4px;
                      padding: 2px 6px;
                      font-size: 10px;
                      color: #2e7d32;
                    }

                    .no-availability {
                      color: #f44336;
                      font-style: italic;
                      font-size: 11px;
                    }
                  }
                }
              }

              .teacher-stats {
                flex-direction: column;
                gap: 4px;

                .stat-item {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  font-size: 11px;
                  color: #666;

                  mat-icon {
                    font-size: 14px;
                    width: 14px;
                    height: 14px;
                  }
                }
              }
            }

            .teacher-actions {
              margin-top: 12px;

              .actions-row {
                display: flex;
                gap: 8px;
                margin-top: 8px;

                button {
                  font-size: 11px;
                  height: 28px;

                  mat-icon {
                    font-size: 14px;
                    width: 14px;
                    height: 14px;
                  }
                }
              }
            }
          }

          .selection-overlay {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #2196f3;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }
          }
        }
      }

      .help-panel {
        mat-card {
          background: #e8f5e8;

          mat-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #2e7d32;
          }

          .help-list {
            list-style: none;
            padding: 0;
            margin: 0;

            li {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 8px;
              font-size: 12px;
              color: #333;

              &:last-child {
                margin-bottom: 0;
              }

              mat-icon {
                font-size: 14px;
                width: 14px;
                height: 14px;
                color: #4caf50;
                margin-top: 1px;
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .teacher-selector {
        .selector-header {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;

          .search-field {
            max-width: none;
          }

          .filter-options {
            justify-content: center;
          }
        }

        .teacher-card {
          .teacher-header {
            flex-wrap: wrap;

            .teacher-indicators {
              flex-basis: 100%;
              justify-content: flex-end;
              margin-top: 8px;
            }
          }
        }
      }
    }
  `]
})
export class TeacherSelectorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private destroy$ = new Subject<void>();

  @Input() eligibleTeachers: Teacher[] = [];
  @Input() selectedDay: string | null = null;
  @Input() selectedTimeSlot: any = null;
  @Input() requiredKnowledgeArea: string | null = null;

  @Output() teacherSelected = new EventEmitter<Teacher>();
  @Output() availabilityCheck = new EventEmitter<any>();

  // Form control
  searchControl = new FormControl('');

  // Data
  filteredTeachers: Teacher[] = [];
  teacherAvailabilities: Map<string, TeacherAvailability[]> = new Map();
  teacherWorkloads: Map<string, number> = new Map();

  // State
  loading = false;
  showOnlyAvailable = false;
  showCompatibilityScore = false;
  showHelp = false;
  selectedTeacherId: string | null = null;

  // ControlValueAccessor
  value: string | null = null;
  onChange = (value: any) => {};
  onTouched = () => {};

  constructor(private classAssignmentService: ClassAssignmentService) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadTeacherData();
    this.filteredTeachers = [...this.eligibleTeachers];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value;
    this.selectedTeacherId = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterTeachers(searchTerm || '');
      });
  }

  private loadTeacherData(): void {
    // Cargar disponibilidades y cargas de trabajo para cada docente
    this.eligibleTeachers.forEach(teacher => {
      this.loadTeacherAvailability(teacher.uuid);
      this.loadTeacherWorkload(teacher.uuid);
    });
  }

  private loadTeacherAvailability(teacherUuid: string): void {
    this.classAssignmentService.getTeacherAvailabilities(teacherUuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const availabilities = Array.isArray(response.data) ? response.data : [response.data];
          this.teacherAvailabilities.set(teacherUuid, availabilities);
        },
        error: (error) => {
          console.error('Error al cargar disponibilidad del docente:', error);
        }
      });
  }

  private loadTeacherWorkload(teacherUuid: string): void {
    this.classAssignmentService.getSessionsByTeacher(teacherUuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const sessions = Array.isArray(response.data) ? response.data : [response.data];
          this.teacherWorkloads.set(teacherUuid, sessions.length);
        },
        error: (error) => {
          console.error('Error al cargar carga de trabajo del docente:', error);
        }
      });
  }

  private filterTeachers(searchTerm: string): void {
    let filtered = [...this.eligibleTeachers];

    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(teacher =>
        teacher.fullName.toLowerCase().includes(term) ||
        teacher.email.toLowerCase().includes(term) ||
        teacher.knowledgeAreas.some(area => area.name.toLowerCase().includes(term)) ||
        teacher.department.name.toLowerCase().includes(term)
      );
    }

    // Filtro de disponibilidad
    if (this.showOnlyAvailable && this.selectedDay) {
      filtered = filtered.filter(teacher => this.isAvailable(teacher));
    }

    // Ordenar por compatibilidad y disponibilidad
    filtered.sort((a, b) => {
      const aScore = this.getCompatibilityScore(a);
      const bScore = this.getCompatibilityScore(b);

      if (aScore !== bScore) return bScore - aScore;

      const aAvailable = this.isAvailable(a) ? 1 : 0;
      const bAvailable = this.isAvailable(b) ? 1 : 0;

      return bAvailable - aAvailable;
    });

    this.filteredTeachers = filtered;
  }

  // === TEACHER SELECTION ===

  selectTeacher(teacher: Teacher): void {
    this.selectedTeacherId = teacher.uuid;
    this.value = teacher.uuid;
    this.onChange(teacher.uuid);
    this.onTouched();
    this.teacherSelected.emit(teacher);
  }

  isSelected(teacher: Teacher): boolean {
    return this.selectedTeacherId === teacher.uuid;
  }

  // === COMPATIBILITY CHECKS ===

  isCompatible(teacher: Teacher): boolean {
    if (!this.requiredKnowledgeArea) return true;

    return teacher.knowledgeAreas.some(area =>
      area.uuid === this.requiredKnowledgeArea
    );
  }

  isAreaCompatible(area: any): boolean {
    return area.uuid === this.requiredKnowledgeArea;
  }

  getCompatibilityScore(teacher: Teacher): number {
    let score = 0;

    // Puntuación base por compatibilidad de área
    if (this.isCompatible(teacher)) score += 50;

    // Puntuación por disponibilidad
    if (this.isAvailable(teacher)) score += 30;

    // Puntuación por carga de trabajo (menos es mejor)
    const workload = this.getTeacherWorkload(teacher) || 0;
    if (workload === 0) score += 20;
    else if (workload <= 5) score += 15;
    else if (workload <= 10) score += 10;

    // Puntuación por disponibilidades registradas
    const availabilities = teacher.totalAvailabilities || 0;
    if (availabilities >= 15) score += 10;
    else if (availabilities >= 10) score += 5;

    return Math.min(100, score);
  }

  // === AVAILABILITY CHECKS ===

  isAvailable(teacher: Teacher): boolean {
    if (!this.selectedDay) return true;

    const availabilities = this.getTeacherDayAvailability(teacher);
    return availabilities.length > 0;
  }

  getTeacherDayAvailability(teacher: Teacher): TeacherAvailability[] {
    if (!this.selectedDay) return [];

    const availabilities = this.teacherAvailabilities.get(teacher.uuid) || [];
    return availabilities.filter(availability =>
      availability.dayOfWeek === this.selectedDay
    );
  }

  // === UTILITY METHODS ===

  getTeacherWorkload(teacher: Teacher): number | null {
    return this.teacherWorkloads.get(teacher.uuid) || null;
  }

  formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
  }

  get dayLabel(): string {
    const dayLabels: { [key: string]: string } = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes',
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes'
    };
    return dayLabels[this.selectedDay || ''] || '';
  }

  // === EVENT HANDLERS ===

  toggleAvailabilityFilter(enabled: boolean): void {
    this.showOnlyAvailable = enabled;
    this.filterTeachers(this.searchControl.value || '');
  }

  toggleCompatibilityScore(enabled: boolean): void {
    this.showCompatibilityScore = enabled;
  }

  viewTeacherSchedule(teacher: Teacher): void {
    // Emitir evento para ver horario del docente
    // Esto podría abrir un modal o navegar a una vista específica
    console.log('Ver horario de:', teacher.fullName);
  }

  viewTeacherAvailability(teacher: Teacher): void {
    // Emitir evento para ver disponibilidad detallada
    this.availabilityCheck.emit({
      teacherUuid: teacher.uuid,
      teacherName: teacher.fullName,
      day: this.selectedDay
    });
  }

  // === TRACK BY ===

  trackByTeacherId(index: number, teacher: Teacher): string {
    return teacher.uuid;
  }
}
