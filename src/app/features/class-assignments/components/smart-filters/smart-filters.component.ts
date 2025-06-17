// src/app/features/class-assignments/components/smart-filters/smart-filters.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSliderModule } from '@angular/material/slider';

// Services and Types
import {
  ClassAssignmentService,
  Teacher,
  StudentGroup,
  Course,
  LearningSpace,
  TimeSlot
} from '../../services/class-assignment.service';

export interface SmartFilterConfig {
  // Filtros básicos
  period?: string;
  modality?: string;
  career?: string;
  cycle?: string;

  // Filtros específicos
  teacher?: string;
  course?: string;
  group?: string;
  space?: string;
  timeSlot?: string;

  // Filtros de tiempo
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;

  // Filtros avanzados
  sessionType?: string;
  minCapacity?: number;
  maxCapacity?: number;
  onlyAvailable?: boolean;
  showConflicts?: boolean;

  // Filtros de estado
  assignmentStatus?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'CONFLICTS';
  completionLevel?: 'ALL' | 'COMPLETE' | 'PARTIAL' | 'EMPTY';
}

@Component({
  selector: 'app-smart-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSliderModule
  ],
  template: `
    <div class="smart-filters">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>tune</mat-icon>
            Filtros Inteligentes
          </mat-card-title>
          <mat-card-subtitle>
            Configuración avanzada de visualización
          </mat-card-subtitle>

          <div class="header-actions">
            <button
              mat-icon-button
              (click)="toggleFilterPanel()"
              [matTooltip]="isExpanded ? 'Contraer filtros' : 'Expandir filtros'">
              <mat-icon>{{ isExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>

            <button
              mat-icon-button
              (click)="resetFilters()"
              matTooltip="Restablecer filtros">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </mat-card-header>

        <mat-card-content [class.collapsed]="!isExpanded">
          <form [formGroup]="filtersForm" class="filters-form">

            <!-- Filtros rápidos -->
            <div class="quick-filters">
              <h4>
                <mat-icon>flash_on</mat-icon>
                Filtros Rápidos
              </h4>

              <div class="quick-filter-buttons">
                <button
                  mat-button-toggle
                  [class.active]="quickFilter === 'today'"
                  (click)="applyQuickFilter('today')">
                  <mat-icon>today</mat-icon>
                  Hoy
                </button>

                <button
                  mat-button-toggle
                  [class.active]="quickFilter === 'week'"
                  (click)="applyQuickFilter('week')">
                  <mat-icon>date_range</mat-icon>
                  Esta Semana
                </button>

                <button
                  mat-button-toggle
                  [class.active]="quickFilter === 'conflicts'"
                  (click)="applyQuickFilter('conflicts')">
                  <mat-icon [matBadge]="conflictsCount" matBadgeColor="warn">warning</mat-icon>
                  Conflictos
                </button>

                <button
                  mat-button-toggle
                  [class.active]="quickFilter === 'unassigned'"
                  (click)="applyQuickFilter('unassigned')">
                  <mat-icon [matBadge]="unassignedCount" matBadgeColor="accent">schedule_off</mat-icon>
                  Sin Asignar
                </button>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Filtros jerárquicos -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>account_tree</mat-icon>
                  Estructura Académica
                </mat-panel-title>
                <mat-panel-description>
                  Modalidad, carrera, ciclo
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="filter-section">
                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Modalidad Educativa</mat-label>
                    <mat-select formControlName="modality" (selectionChange)="onModalityChange($event.value)">
                      <mat-option value="">Todas las modalidades</mat-option>
                      <mat-option *ngFor="let modality of modalities" [value]="modality.uuid">
                        {{ modality.name }} ({{ modality.durationYears }} años)
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Carrera</mat-label>
                    <mat-select
                      formControlName="career"
                      [disabled]="!filtersForm.value.modality"
                      (selectionChange)="onCareerChange($event.value)">
                      <mat-option value="">Todas las carreras</mat-option>
                      <mat-option *ngFor="let career of filteredCareers" [value]="career.uuid">
                        {{ career.name }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Ciclo</mat-label>
                    <mat-select
                      formControlName="cycle"
                      [disabled]="!filtersForm.value.career">
                      <mat-option value="">Todos los ciclos</mat-option>
                      <mat-option *ngFor="let cycle of filteredCycles" [value]="cycle.uuid">
                        Ciclo {{ cycle.number }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Filtros de entidades -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>people</mat-icon>
                  Entidades Específicas
                </mat-panel-title>
                <mat-panel-description>
                  Docente, curso, grupo, aula
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="filter-section">
                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Docente</mat-label>
                    <mat-select formControlName="teacher">
                      <mat-option value="">Todos los docentes</mat-option>
                      <mat-option *ngFor="let teacher of teachers" [value]="teacher.uuid">
                        <div class="teacher-option">
                          <span class="teacher-name">{{ teacher.fullName }}</span>
                          <span class="teacher-department">{{ teacher.department.name }}</span>
                        </div>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Curso</mat-label>
                    <mat-select formControlName="course">
                      <mat-option value="">Todos los cursos</mat-option>
                      <mat-option *ngFor="let course of filteredCourses" [value]="course.uuid">
                        <div class="course-option">
                          <span class="course-code">{{ course.code }}</span>
                          <span class="course-name">{{ course.name }}</span>
                        </div>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Grupo de Estudiantes</mat-label>
                    <mat-select formControlName="group">
                      <mat-option value="">Todos los grupos</mat-option>
                      <mat-option *ngFor="let group of filteredGroups" [value]="group.uuid">
                        <div class="group-option">
                          <span class="group-name">{{ group.name }}</span>
                          <span class="group-cycle">Ciclo {{ group.cycleNumber }}</span>
                        </div>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Aula</mat-label>
                    <mat-select formControlName="space">
                      <mat-option value="">Todas las aulas</mat-option>
                      <mat-option *ngFor="let space of spaces" [value]="space.uuid">
                        <div class="space-option">
                          <span class="space-name">{{ space.name }}</span>
                          <span class="space-type">{{ getSpaceTypeText(space) }}</span>
                          <span class="space-capacity">({{ space.capacity }})</span>
                        </div>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Filtros de tiempo -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>schedule</mat-icon>
                  Filtros de Tiempo
                </mat-panel-title>
                <mat-panel-description>
                  Día, turno, horario específico
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="filter-section">
                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Día de la Semana</mat-label>
                    <mat-select formControlName="dayOfWeek">
                      <mat-option value="">Todos los días</mat-option>
                      <mat-option value="MONDAY">Lunes</mat-option>
                      <mat-option value="TUESDAY">Martes</mat-option>
                      <mat-option value="WEDNESDAY">Miércoles</mat-option>
                      <mat-option value="THURSDAY">Jueves</mat-option>
                      <mat-option value="FRIDAY">Viernes</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Turno</mat-label>
                    <mat-select formControlName="timeSlot">
                      <mat-option value="">Todos los turnos</mat-option>
                      <mat-option *ngFor="let slot of timeSlots" [value]="slot.uuid">
                        {{ slot.name }} ({{ slot.startTime }} - {{ slot.endTime }})
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Hora de Inicio</mat-label>
                    <input matInput type="time" formControlName="startTime">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Hora de Fin</mat-label>
                    <input matInput type="time" formControlName="endTime">
                  </mat-form-field>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Filtros avanzados -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>settings</mat-icon>
                  Filtros Avanzados
                </mat-panel-title>
                <mat-panel-description>
                  Tipo, capacidad, estado
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="filter-section">
                <div class="filter-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de Sesión</mat-label>
                    <mat-select formControlName="sessionType">
                      <mat-option value="">Todos los tipos</mat-option>
                      <mat-option value="THEORY">
                        <div class="session-type-option">
                          <mat-icon>menu_book</mat-icon>
                          Teórica
                        </div>
                      </mat-option>
                      <mat-option value="PRACTICE">
                        <div class="session-type-option">
                          <mat-icon>science</mat-icon>
                          Práctica
                        </div>
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Estado de Asignación</mat-label>
                    <mat-select formControlName="assignmentStatus">
                      <mat-option value="ALL">Todos</mat-option>
                      <mat-option value="ASSIGNED">Asignadas</mat-option>
                      <mat-option value="UNASSIGNED">Sin asignar</mat-option>
                      <mat-option value="CONFLICTS">Con conflictos</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <!-- Slider de capacidad -->
                <div class="capacity-filter">
                  <label>Capacidad del Aula</label>
                  <mat-slider
                    min="1"
                    max="200"
                    step="5"
                    [disabled]="!filtersForm.value.space">
                    <input matSliderStartThumb formControlName="minCapacity">
                    <input matSliderEndThumb formControlName="maxCapacity">
                  </mat-slider>
                  <div class="capacity-labels">
                    <span>{{ filtersForm.value.minCapacity || 1 }}</span>
                    <span>{{ filtersForm.value.maxCapacity || 200 }}</span>
                  </div>
                </div>

                <!-- Toggles -->
                <div class="toggle-filters">
                  <mat-slide-toggle formControlName="onlyAvailable">
                    <mat-icon>check_circle</mat-icon>
                    Solo disponibles
                  </mat-slide-toggle>

                  <mat-slide-toggle formControlName="showConflicts">
                    <mat-icon>warning</mat-icon>
                    Mostrar conflictos
                  </mat-slide-toggle>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Filtros guardados -->
            <div class="saved-filters" *ngIf="savedFilters.length > 0">
              <h4>
                <mat-icon>bookmark</mat-icon>
                Filtros Guardados
              </h4>
              <div class="saved-filter-chips">
                <mat-chip-set>
                  <mat-chip
                    *ngFor="let savedFilter of savedFilters"
                    [removable]="true"
                    (removed)="removeSavedFilter(savedFilter)"
                    (click)="applySavedFilter(savedFilter)">
                    <mat-icon matChipAvatar>bookmark</mat-icon>
                    {{ savedFilter.name }}
                    <mat-icon matChipRemove>cancel</mat-icon>
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>

          </form>
        </mat-card-content>

        <mat-card-actions>
          <div class="filter-actions">
            <div class="filter-stats">
              <span class="active-filters" *ngIf="getActiveFiltersCount() > 0">
                {{ getActiveFiltersCount() }} filtro(s) activo(s)
              </span>
            </div>

            <div class="action-buttons">
              <button
                mat-stroked-button
                (click)="saveCurrentFilters()"
                [disabled]="getActiveFiltersCount() === 0">
                <mat-icon>bookmark_add</mat-icon>
                Guardar
              </button>

              <button
                mat-stroked-button
                (click)="clearFilters()"
                [disabled]="getActiveFiltersCount() === 0">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>

              <button
                mat-raised-button
                color="primary"
                (click)="applyFilters()">
                <mat-icon>search</mat-icon>
                Aplicar Filtros
              </button>
            </div>
          </div>
        </mat-card-actions>

      </mat-card>
    </div>
  `,
  styles: [`
    .smart-filters {
      width: 100%;

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-actions {
          display: flex;
          gap: 4px;
        }
      }

      mat-card-content {
        transition: all 0.3s ease;

        &.collapsed {
          max-height: 0;
          padding: 0 16px;
          overflow: hidden;
        }
      }

      .filters-form {
        display: flex;
        flex-direction: column;
        gap: 20px;

        .quick-filters {
          h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 12px 0;
            color: #333;
          }

          .quick-filter-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;

            button {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              border: 1px solid #e0e0e0;
              border-radius: 20px;
              background: white;
              transition: all 0.2s ease;

              &:hover {
                background: #f5f5f5;
                border-color: #2196f3;
              }

              &.active {
                background: #e3f2fd;
                border-color: #2196f3;
                color: #1976d2;
              }

              mat-icon {
                font-size: 16px;
                width: 16px;
                height: 16px;
              }
            }
          }
        }

        .filter-section {
          padding: 16px 0;

          .filter-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;

            mat-form-field {
              flex: 1;
            }
          }

          .capacity-filter {
            margin: 16px 0;

            label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
              color: #666;
            }

            .capacity-labels {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              font-size: 12px;
              color: #666;
            }
          }

          .toggle-filters {
            display: flex;
            gap: 24px;
            margin-top: 16px;

            mat-slide-toggle {
              display: flex;
              align-items: center;
              gap: 8px;

              mat-icon {
                font-size: 16px;
                width: 16px;
                height: 16px;
              }
            }
          }
        }

        .saved-filters {
          h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 12px 0;
            color: #333;
          }

          .saved-filter-chips {
            mat-chip {
              margin: 4px;
              cursor: pointer;

              &:hover {
                background: #e3f2fd;
              }
            }
          }
        }

        // Estilos para opciones de select
        .teacher-option, .course-option, .group-option, .space-option {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .teacher-name, .course-code, .group-name, .space-name {
            font-weight: 500;
          }

          .teacher-department, .course-name, .group-cycle, .space-type, .space-capacity {
            font-size: 0.8rem;
            color: #666;
          }
        }

        .session-type-option {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .filter-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .filter-stats {
          .active-filters {
            font-size: 12px;
            color: #666;
            background: #e3f2fd;
            padding: 4px 8px;
            border-radius: 12px;
          }
        }

        .action-buttons {
          display: flex;
          gap: 8px;

          button {
            display: flex;
            align-items: center;
            gap: 6px;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .smart-filters {
        .filters-form {
          .filter-section {
            .filter-row {
              flex-direction: column;
              gap: 12px;
            }

            .toggle-filters {
              flex-direction: column;
              gap: 12px;
            }
          }

          .quick-filter-buttons {
            justify-content: center;
          }
        }

        .filter-actions {
          flex-direction: column;
          gap: 12px;
          align-items: stretch;

          .action-buttons {
            justify-content: center;
          }
        }
      }
    }
  `]
})
export class SmartFiltersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() initialFilters: SmartFilterConfig = {};
  @Output() filtersChanged = new EventEmitter<SmartFilterConfig>();
  @Output() quickFilterApplied = new EventEmitter<string>();

  // Form
  filtersForm!: FormGroup;

  // Data
  modalities: any[] = [];
  careers: any[] = [];
  cycles: any[] = [];
  teachers: Teacher[] = [];
  courses: Course[] = [];
  groups: StudentGroup[] = [];
  spaces: LearningSpace[] = [];
  timeSlots: TimeSlot[] = [];

  // Filtered data
  filteredCareers: any[] = [];
  filteredCycles: any[] = [];
  filteredCourses: Course[] = [];
  filteredGroups: StudentGroup[] = [];

  // State
  isExpanded = true;
  quickFilter = '';
  conflictsCount = 0;
  unassignedCount = 0;

  // Saved filters
  savedFilters: Array<{name: string, config: SmartFilterConfig}> = [];

  constructor(
    private fb: FormBuilder,
    private classAssignmentService: ClassAssignmentService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormSubscriptions();
    this.loadSavedFilters();
    this.loadStatistics();

    if (this.initialFilters) {
      this.filtersForm.patchValue(this.initialFilters);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filtersForm = this.fb.group({
      // Filtros básicos
      period: [''],
      modality: [''],
      career: [''],
      cycle: [''],

      // Entidades específicas
      teacher: [''],
      course: [''],
      group: [''],
      space: [''],
      timeSlot: [''],

      // Tiempo
      dayOfWeek: [''],
      startTime: [''],
      endTime: [''],

      // Avanzados
      sessionType: [''],
      minCapacity: [1],
      maxCapacity: [200],
      onlyAvailable: [false],
      showConflicts: [true],

      // Estado
      assignmentStatus: ['ALL'],
      completionLevel: ['ALL']
    });
  }

  private loadInitialData(): void {
    combineLatest([
      this.classAssignmentService.getAllModalities(),
      this.classAssignmentService.getAllCareers(),
      this.classAssignmentService.getAllTeachers(),
      this.classAssignmentService.getAllCourses(),
      this.classAssignmentService.getAllStudentGroups(),
      this.classAssignmentService.getAllLearningSpaces(),
      this.classAssignmentService.getAllTimeSlots()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([modalitiesRes, careersRes, teachersRes, coursesRes, groupsRes, spacesRes, slotsRes]) => {
          this.modalities = Array.isArray(modalitiesRes.data) ? modalitiesRes.data : [modalitiesRes.data];
          this.careers = Array.isArray(careersRes.data) ? careersRes.data : [careersRes.data];
          this.teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [teachersRes.data];
          this.courses = Array.isArray(coursesRes.data) ? coursesRes.data : [coursesRes.data];
          this.groups = Array.isArray(groupsRes.data) ? groupsRes.data : [groupsRes.data];
          this.spaces = Array.isArray(spacesRes.data) ? spacesRes.data : [spacesRes.data];
          this.timeSlots = Array.isArray(slotsRes.data) ? slotsRes.data : [slotsRes.data];

          this.filteredCareers = [...this.careers];
          this.filteredCourses = [...this.courses];
          this.filteredGroups = [...this.groups];
        },
        error: (error) => {
          console.error('Error al cargar datos para filtros:', error);
        }
      });
  }

  private setupFormSubscriptions(): void {
    // Emisión de cambios con debounce
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(formValue => {
        const config = this.buildFilterConfig(formValue);
        this.filtersChanged.emit(config);
      });
  }

  private loadSavedFilters(): void {
    // Cargar filtros guardados del localStorage
    const saved = localStorage.getItem('schedule-saved-filters');
    if (saved) {
      try {
        this.savedFilters = JSON.parse(saved);
      } catch (error) {
        console.error('Error al cargar filtros guardados:', error);
      }
    }
  }

  private loadStatistics(): void {
    // Cargar estadísticas de conflictos y asignaciones
    // En producción, estos datos vendrían del backend
    this.conflictsCount = Math.floor(Math.random() * 15);
    this.unassignedCount = Math.floor(Math.random() * 30);
  }

  // === FILTER CASCADING ===

  onModalityChange(modalityUuid: string): void {
    // Filtrar carreras por modalidad
    this.filteredCareers = modalityUuid
      ? this.careers.filter(career => career.modality.uuid === modalityUuid)
      : [...this.careers];

    // Limpiar selecciones dependientes
    this.filtersForm.patchValue({
      career: '',
      cycle: ''
    });

    this.filteredCycles = [];
    this.updateDependentFilters();
  }

  onCareerChange(careerUuid: string): void {
    // Obtener ciclos de la carrera seleccionada
    const selectedCareer = this.careers.find(career => career.uuid === careerUuid);
    this.filteredCycles = selectedCareer ? selectedCareer.cycles || [] : [];

    // Limpiar ciclo seleccionado
    this.filtersForm.patchValue({ cycle: '' });

    this.updateDependentFilters();
  }

  private updateDependentFilters(): void {
    const formValue = this.filtersForm.value;

    // Filtrar cursos según la jerarquía seleccionada
    this.filteredCourses = this.courses.filter(course => {
      if (formValue.modality && course.modality.uuid !== formValue.modality) return false;
      if (formValue.career && course.career.uuid !== formValue.career) return false;
      if (formValue.cycle && course.cycle.uuid !== formValue.cycle) return false;
      return true;
    });

    // Filtrar grupos según la jerarquía seleccionada
    this.filteredGroups = this.groups.filter(group => {
      if (formValue.cycle && group.cycleUuid !== formValue.cycle) return false;
      return true;
    });
  }

  // === QUICK FILTERS ===

  applyQuickFilter(filterType: string): void {
    this.quickFilter = this.quickFilter === filterType ? '' : filterType;

    switch (filterType) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        this.filtersForm.patchValue({
          dayOfWeek: this.getTodayDayOfWeek()
        });
        break;

      case 'week':
        // Aplicar filtro para la semana actual
        this.filtersForm.patchValue({
          dayOfWeek: ''
        });
        break;

      case 'conflicts':
        this.filtersForm.patchValue({
          assignmentStatus: 'CONFLICTS',
          showConflicts: true
        });
        break;

      case 'unassigned':
        this.filtersForm.patchValue({
          assignmentStatus: 'UNASSIGNED'
        });
        break;
    }

    this.quickFilterApplied.emit(filterType);
  }

  private getTodayDayOfWeek(): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  }

  // === SAVED FILTERS ===

  saveCurrentFilters(): void {
    const config = this.buildFilterConfig(this.filtersForm.value);

    // Simplificar: usar timestamp como nombre por defecto
    const name = prompt('Nombre para este filtro:') || `Filtro ${new Date().toLocaleString()}`;

    if (name) {
      const savedFilter = { name, config };
      this.savedFilters.push(savedFilter);
      this.updateSavedFiltersStorage();
    }
  }

  applySavedFilter(savedFilter: {name: string, config: SmartFilterConfig}): void {
    this.filtersForm.patchValue(savedFilter.config);
  }

  removeSavedFilter(savedFilter: {name: string, config: SmartFilterConfig}): void {
    this.savedFilters = this.savedFilters.filter(sf => sf !== savedFilter);
    this.updateSavedFiltersStorage();
  }

  private updateSavedFiltersStorage(): void {
    localStorage.setItem('schedule-saved-filters', JSON.stringify(this.savedFilters));
  }

  // === UTILITY METHODS ===

  private buildFilterConfig(formValue: any): SmartFilterConfig {
    // Remover valores vacíos y construir configuración limpia
    const config: SmartFilterConfig = {};

    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        (config as any)[key] = value;
      }
    });

    return config;
  }

  getActiveFiltersCount(): number {
    const config = this.buildFilterConfig(this.filtersForm.value);
    return Object.keys(config).length;
  }

  getSpaceTypeText(space: LearningSpace): string {
    return space.teachingType.name === 'THEORY' ? 'Teórica' : 'Laboratorio';
  }

  // === ACTIONS ===

  toggleFilterPanel(): void {
    this.isExpanded = !this.isExpanded;
  }

  resetFilters(): void {
    this.filtersForm.reset({
      minCapacity: 1,
      maxCapacity: 200,
      showConflicts: true,
      assignmentStatus: 'ALL',
      completionLevel: 'ALL'
    });
    this.quickFilter = '';
  }

  clearFilters(): void {
    this.resetFilters();
    this.filtersChanged.emit({});
  }

  applyFilters(): void {
    const config = this.buildFilterConfig(this.filtersForm.value);
    this.filtersChanged.emit(config);
  }
}
