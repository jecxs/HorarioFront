// src/app/features/class-assignments/components/space-selector/space-selector.component.ts
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
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Services
import { LearningSpace, ClassAssignmentService } from '../../services/class-assignment.service';

interface SpaceOccupancy {
  spaceId: string;
  occupiedHours: number;
  totalHours: number;
  occupancyRate: number;
}

@Component({
  selector: 'app-space-selector',
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
    MatSlideToggleModule,
    MatSliderModule,
    MatButtonToggleModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SpaceSelectorComponent),
      multi: true
    }
  ],
  template: `
    <div class="space-selector">
      <!-- Filtros y configuración -->
      <div class="selector-header">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar aula</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Nombre, tipo o especialidad..."
            autocomplete="off">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="capacity-filter">
          <mat-form-field appearance="outline" class="capacity-field">
            <mat-label>Capacidad mínima</mat-label>
            <input
              matInput
              type="number"
              [formControl]="capacityControl"
              [value]="requiredCapacity"
              min="1"
              max="200">
            <mat-icon matSuffix>people</mat-icon>
          </mat-form-field>
        </div>

        <div class="filter-options">
          <mat-button-toggle-group
            [value]="viewMode"
            (change)="changeViewMode($event.value)">
            <mat-button-toggle value="grid">
              <mat-icon>grid_view</mat-icon>
            </mat-button-toggle>
            <mat-button-toggle value="list">
              <mat-icon>list</mat-icon>
            </mat-button-toggle>
          </mat-button-toggle-group>

          <mat-slide-toggle
            [checked]="showOccupancy"
            (change)="toggleOccupancy($event.checked)"
            color="accent">
            <mat-icon>analytics</mat-icon>
            Ocupación
          </mat-slide-toggle>
        </div>
      </div>

      <!-- Indicadores de tipo requerido -->
      <div class="type-indicator" *ngIf="sessionType">
        <mat-chip-set>
          <mat-chip [color]="getSessionTypeColor()" selected>
            <mat-icon>{{ getSessionTypeIcon() }}</mat-icon>
            Se requiere aula {{ getSessionTypeText() }}
          </mat-chip>
          <mat-chip *ngIf="preferredSpecialty" color="accent">
            <mat-icon>science</mat-icon>
            Especialidad: {{ preferredSpecialty }}
          </mat-chip>
        </mat-chip-set>
      </div>

      <!-- Lista/Grid de espacios -->
      <div class="spaces-container" [class.grid-view]="viewMode === 'grid'" [class.loading]="loading">
        <div class="loading-overlay" *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando espacios...</span>
        </div>

        <div class="no-spaces" *ngIf="!loading && filteredSpaces.length === 0">
          <mat-icon>meeting_room_off</mat-icon>
          <span>No se encontraron aulas con los criterios seleccionados</span>
          <button mat-stroked-button (click)="clearFilters()">
            <mat-icon>clear</mat-icon>
            Limpiar filtros
          </button>
        </div>

        <div
          class="space-card"
          *ngFor="let space of filteredSpaces; trackBy: trackBySpaceId"
          [class.selected]="isSelected(space)"
          [class.compatible]="isCompatible(space)"
          [class.insufficient-capacity]="hasInsufficientCapacity(space)"
          [class.high-occupancy]="hasHighOccupancy(space)"
          (click)="selectSpace(space)">

          <!-- Header del espacio -->
          <div class="space-header">
            <div class="space-icon">
              <mat-icon [color]="getSpaceIconColor(space)">
                {{ getSpaceIcon(space) }}
              </mat-icon>
            </div>

            <div class="space-info">
              <h4 class="space-name">{{ space.name }}</h4>
              <div class="space-metadata">
                <span class="space-type">{{ getSpaceTypeText(space) }}</span>
                <span class="space-capacity">{{ space.capacity }} estudiantes</span>
              </div>
            </div>

            <div class="space-indicators">
              <!-- Indicador de compatibilidad -->
              <mat-icon
                *ngIf="isCompatible(space)"
                class="compatibility-icon"
                matTooltip="Compatible con el tipo de sesión"
                color="primary">
                verified
              </mat-icon>

              <!-- Indicador de capacidad -->
              <mat-icon
                *ngIf="hasInsufficientCapacity(space)"
                class="capacity-warning"
                matTooltip="Capacidad insuficiente"
                color="warn">
                warning
              </mat-icon>

              <!-- Indicador de ocupación -->
              <div
                class="occupancy-indicator"
                *ngIf="showOccupancy && getSpaceOccupancy(space)"
                [matTooltip]="getOccupancyTooltip(space)">
                <div class="occupancy-circle" [class]="getOccupancyClass(space)">
                  <span>{{ getOccupancyPercentage(space) }}%</span>
                </div>
              </div>

              <!-- Checkbox de selección -->
              <mat-checkbox
                [checked]="isSelected(space)"
                (change)="$event.stopPropagation(); selectSpace(space)"
                color="primary">
              </mat-checkbox>
            </div>
          </div>

          <!-- Información detallada -->
          <div class="space-details">
            <div class="detail-section">
              <div class="capacity-info">
                <mat-icon>people</mat-icon>
                <div class="capacity-details">
                  <div class="capacity-bar">
                    <div class="capacity-label">
                      <span>Capacidad: {{ space.capacity }}</span>
                      <span class="required-label" *ngIf="requiredCapacity">
                        (Requerida: {{ requiredCapacity }})
                      </span>
                    </div>
                    <div class="capacity-progress">
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          [style.width.%]="getCapacityUtilization(space)"
                          [class.sufficient]="!hasInsufficientCapacity(space)"
                          [class.insufficient]="hasInsufficientCapacity(space)">
                        </div>
                      </div>
                      <span class="utilization-text">
                        {{ getCapacityUtilization(space) }}% utilización
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <div class="type-info">
                <mat-icon>{{ getSpaceIcon(space) }}</mat-icon>
                <div class="type-details">
                  <mat-chip [color]="space.teachingType.name === 'THEORY' ? 'primary' : 'warn'">
                    {{ getSpaceTypeText(space) }}
                  </mat-chip>
                  <div class="specialty-info" *ngIf="space.specialty">
                    <mat-chip color="accent" class="specialty-chip">
                      <mat-icon>science</mat-icon>
                      {{ space.specialty.name }}
                    </mat-chip>
                    <span class="specialty-description" *ngIf="space.specialty.description">
                      {{ space.specialty.description }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ocupación semanal (si está habilitada) -->
            <div class="detail-section" *ngIf="showOccupancy">
              <div class="occupancy-info">
                <mat-icon>schedule</mat-icon>
                <div class="occupancy-details">
                  <div class="occupancy-stats">
                    <span class="occupancy-label">Ocupación Semanal:</span>
                    <span class="occupancy-hours">
                      {{ getSpaceOccupancyHours(space) }} / {{ getTotalWeeklyHours() }} horas
                    </span>
                  </div>
                  <div class="weekly-schedule" *ngIf="getSpaceOccupancy(space)">
                    <div class="day-occupancy" *ngFor="let day of weekDays">
                      <span class="day-label">{{ day.short }}</span>
                      <div class="day-bar">
                        <div
                          class="day-fill"
                          [style.width.%]="getDayOccupancy(space, day.value)"
                          [class]="getDayOccupancyClass(space, day.value)">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Acciones rápidas -->
            <div class="space-actions" *ngIf="isSelected(space)">
              <mat-divider></mat-divider>
              <div class="actions-row">
                <button
                  mat-stroked-button
                  size="small"
                  (click)="$event.stopPropagation(); viewSpaceSchedule(space)">
                  <mat-icon>calendar_view_week</mat-icon>
                  Ver Horario
                </button>
                <button
                  mat-stroked-button
                  size="small"
                  (click)="$event.stopPropagation(); viewSpaceDetails(space)">
                  <mat-icon>info</mat-icon>
                  Detalles
                </button>
              </div>
            </div>
          </div>

          <!-- Overlay de selección -->
          <div class="selection-overlay" *ngIf="isSelected(space)">
            <mat-icon>check_circle</mat-icon>
          </div>

          <!-- Badge de incompatibilidad -->
          <div class="incompatibility-badge" *ngIf="!isCompatible(space)">
            <mat-icon>block</mat-icon>
            <span>Incompatible</span>
          </div>
        </div>
      </div>

      <!-- Panel de recomendaciones -->
      <div class="recommendations-panel" *ngIf="showRecommendations && recommendations.length > 0">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>lightbulb</mat-icon>
              Recomendaciones
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="recommendation-item" *ngFor="let rec of recommendations">
              <mat-icon [color]="rec.type === 'warning' ? 'warn' : 'accent'">
                {{ rec.type === 'warning' ? 'warning' : 'tips_and_updates' }}
              </mat-icon>
              <span>{{ rec.message }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .space-selector {
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
        flex-wrap: wrap;

        .search-field {
          flex: 1;
          min-width: 200px;
        }

        .capacity-filter {
          .capacity-field {
            width: 150px;
          }
        }

        .filter-options {
          display: flex;
          gap: 12px;
          align-items: center;

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

      .type-indicator {
        padding: 8px 16px;
        background: #e3f2fd;
        border-radius: 8px;
        border-left: 4px solid #2196f3;

        mat-chip {
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

      .spaces-container {
        position: relative;
        max-height: 500px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 8px;

        &.grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          padding: 16px;
          max-height: 600px;

          .space-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
        }

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

        .no-spaces {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
          gap: 12px;

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            opacity: 0.5;
          }
        }

        .space-card {
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

          &.insufficient-capacity {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
          }

          &.high-occupancy {
            background: #ffebee;
          }

          .space-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;

            .space-icon {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              background: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;

              mat-icon {
                font-size: 24px;
                width: 24px;
                height: 24px;
              }
            }

            .space-info {
              flex: 1;

              .space-name {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 500;
                color: #333;
              }

              .space-metadata {
                display: flex;
                gap: 8px;
                font-size: 12px;
                color: #666;

                .space-type {
                  font-weight: 500;
                }
              }
            }

            .space-indicators {
              display: flex;
              align-items: center;
              gap: 8px;

              .compatibility-icon {
                color: #4caf50;
              }

              .capacity-warning {
                color: #ff9800;
              }

              .occupancy-indicator {
                .occupancy-circle {
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                  font-weight: 600;
                  color: white;

                  &.low {
                    background: #4caf50;
                  }

                  &.medium {
                    background: #ff9800;
                  }

                  &.high {
                    background: #f44336;
                  }
                }
              }
            }
          }

          .space-details {
            .detail-section {
              margin-bottom: 12px;

              &:last-child {
                margin-bottom: 0;
              }

              .capacity-info, .type-info, .occupancy-info {
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

              .capacity-details {
                flex: 1;

                .capacity-bar {
                  .capacity-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 11px;

                    .required-label {
                      color: #666;
                    }
                  }

                  .capacity-progress {
                    .progress-bar {
                      height: 6px;
                      background: #e0e0e0;
                      border-radius: 3px;
                      overflow: hidden;
                      margin-bottom: 4px;

                      .progress-fill {
                        height: 100%;
                        transition: width 0.3s ease;

                        &.sufficient {
                          background: #4caf50;
                        }

                        &.insufficient {
                          background: #ff9800;
                        }
                      }
                    }

                    .utilization-text {
                      font-size: 10px;
                      color: #666;
                    }
                  }
                }
              }

              .type-details {
                flex: 1;

                .specialty-info {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  margin-top: 6px;

                  .specialty-chip {
                    align-self: flex-start;
                    font-size: 10px;
                    height: 20px;

                    mat-icon {
                      font-size: 12px;
                      width: 12px;
                      height: 12px;
                    }
                  }

                  .specialty-description {
                    font-size: 10px;
                    color: #666;
                    font-style: italic;
                  }
                }
              }

              .occupancy-details {
                flex: 1;

                .occupancy-stats {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 6px;
                  font-size: 11px;

                  .occupancy-label {
                    font-weight: 500;
                  }

                  .occupancy-hours {
                    color: #666;
                  }
                }

                .weekly-schedule {
                  display: flex;
                  gap: 2px;

                  .day-occupancy {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;

                    .day-label {
                      font-size: 8px;
                      text-align: center;
                      color: #666;
                    }

                    .day-bar {
                      height: 4px;
                      background: #e0e0e0;
                      border-radius: 2px;
                      overflow: hidden;

                      .day-fill {
                        height: 100%;
                        transition: width 0.3s ease;

                        &.low {
                          background: #4caf50;
                        }

                        &.medium {
                          background: #ff9800;
                        }

                        &.high {
                          background: #f44336;
                        }
                      }
                    }
                  }
                }
              }
            }

            .space-actions {
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

          .incompatibility-badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: #f44336;
            color: white;
            border-radius: 12px;
            padding: 4px 8px;
            font-size: 10px;
            display: flex;
            align-items: center;
            gap: 4px;

            mat-icon {
              font-size: 12px;
              width: 12px;
              height: 12px;
            }
          }
        }
      }

      .recommendations-panel {
        mat-card {
          background: #fff9c4;

          mat-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #f57f17;
          }

          .recommendation-item {
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
              margin-top: 1px;
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .space-selector {
        .selector-header {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;

          .search-field, .capacity-field {
            min-width: auto;
          }

          .filter-options {
            justify-content: center;
          }
        }

        .spaces-container {
          &.grid-view {
            grid-template-columns: 1fr;
            padding: 8px;

            .space-card {
              margin-bottom: 8px;
            }
          }

          .space-card {
            .space-header {
              flex-wrap: wrap;

              .space-indicators {
                flex-basis: 100%;
                justify-content: flex-end;
                margin-top: 8px;
              }
            }
          }
        }
      }
    }
  `]
})
export class SpaceSelectorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private destroy$ = new Subject<void>();

  @Input() eligibleSpaces: LearningSpace[] = [];
  @Input() requiredCapacity: number = 30;
  @Input() sessionType: string | null = null;
  @Input() preferredSpecialty: string | null = null;

  @Output() spaceSelected = new EventEmitter<LearningSpace>();

  // Form controls
  searchControl = new FormControl('');
  capacityControl = new FormControl(30);

  // Data
  filteredSpaces: LearningSpace[] = [];
  spaceOccupancies: Map<string, SpaceOccupancy> = new Map();

  // State
  loading = false;
  viewMode: 'grid' | 'list' = 'list';
  showOccupancy = false;
  showRecommendations = true;
  selectedSpaceId: string | null = null;

  // Recommendations
  recommendations: Array<{type: 'warning' | 'info', message: string}> = [];

  // Constants
  weekDays = [
    { value: 'MONDAY', short: 'L', full: 'Lunes' },
    { value: 'TUESDAY', short: 'M', full: 'Martes' },
    { value: 'WEDNESDAY', short: 'X', full: 'Miércoles' },
    { value: 'THURSDAY', short: 'J', full: 'Jueves' },
    { value: 'FRIDAY', short: 'V', full: 'Viernes' }
  ];

  // ControlValueAccessor
  value: string | null = null;
  onChange = (value: any) => {};
  onTouched = () => {};

  constructor(private classAssignmentService: ClassAssignmentService) {}

  ngOnInit(): void {
    this.setupControls();
    this.loadSpaceData();
    this.filteredSpaces = [...this.eligibleSpaces];
    this.generateRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value = value;
    this.selectedSpaceId = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  private setupControls(): void {
    // Búsqueda
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterSpaces();
      });

    // Capacidad
    this.capacityControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(capacity => {
        this.requiredCapacity = capacity || 30;
        this.filterSpaces();
        this.generateRecommendations();
      });
  }

  private loadSpaceData(): void {
    if (this.showOccupancy) {
      this.eligibleSpaces.forEach(space => {
        this.loadSpaceOccupancy(space.uuid);
      });
    }
  }

  private loadSpaceOccupancy(spaceUuid: string): void {
    // Simular carga de ocupación - en producción usar el servicio real
    // this.classAssignmentService.getSpaceOccupancy(spaceUuid)
    const mockOccupancy: SpaceOccupancy = {
      spaceId: spaceUuid,
      occupiedHours: Math.floor(Math.random() * 40),
      totalHours: 45, // 9 horas/día * 5 días
      occupancyRate: 0
    };
    mockOccupancy.occupancyRate = (mockOccupancy.occupiedHours / mockOccupancy.totalHours) * 100;

    this.spaceOccupancies.set(spaceUuid, mockOccupancy);
  }

  private filterSpaces(): void {
    let filtered = [...this.eligibleSpaces];
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(space =>
        space.name.toLowerCase().includes(searchTerm) ||
        space.teachingType.name.toLowerCase().includes(searchTerm) ||
        (space.specialty?.name.toLowerCase().includes(searchTerm))
      );
    }

    // Filtro de capacidad
    if (this.requiredCapacity > 0) {
      filtered = filtered.filter(space => space.capacity >= this.requiredCapacity);
    }

    // Ordenar por compatibilidad y capacidad
    filtered.sort((a, b) => {
      // Primero espacios compatibles
      const aCompatible = this.isCompatible(a) ? 1 : 0;
      const bCompatible = this.isCompatible(b) ? 1 : 0;
      if (aCompatible !== bCompatible) return bCompatible - aCompatible;

      // Luego por capacidad suficiente
      const aCapacity = this.hasInsufficientCapacity(a) ? 0 : 1;
      const bCapacity = this.hasInsufficientCapacity(b) ? 0 : 1;
      if (aCapacity !== bCapacity) return bCapacity - aCapacity;

      // Finalmente por capacidad ascendente (preferir espacios más pequeños pero suficientes)
      return a.capacity - b.capacity;
    });

    this.filteredSpaces = filtered;
  }

  private generateRecommendations(): void {
    this.recommendations = [];

    const compatibleSpaces = this.eligibleSpaces.filter(space => this.isCompatible(space));
    const sufficientCapacitySpaces = this.eligibleSpaces.filter(space => !this.hasInsufficientCapacity(space));

    if (compatibleSpaces.length === 0) {
      this.recommendations.push({
        type: 'warning',
        message: 'No hay aulas del tipo requerido disponibles. Considere cambiar el tipo de sesión.'
      });
    }

    if (sufficientCapacitySpaces.length === 0) {
      this.recommendations.push({
        type: 'warning',
        message: `No hay aulas con capacidad suficiente (${this.requiredCapacity}+ estudiantes). Considere reducir el tamaño del grupo.`
      });
    }

    if (this.preferredSpecialty) {
      const specialtySpaces = this.eligibleSpaces.filter(space =>
        space.specialty?.name === this.preferredSpecialty
      );
      if (specialtySpaces.length === 0) {
        this.recommendations.push({
          type: 'info',
          message: `No hay laboratorios con la especialidad "${this.preferredSpecialty}". Se muestran laboratorios alternativos.`
        });
      }
    }

    if (this.requiredCapacity > 50) {
      this.recommendations.push({
        type: 'info',
        message: 'Para grupos grandes, considere dividir en secciones más pequeñas para mejor aprovechamiento del espacio.'
      });
    }
  }

  // === SPACE SELECTION ===

  selectSpace(space: LearningSpace): void {
    this.selectedSpaceId = space.uuid;
    this.value = space.uuid;
    this.onChange(space.uuid);
    this.onTouched();
    this.spaceSelected.emit(space);
  }

  isSelected(space: LearningSpace): boolean {
    return this.selectedSpaceId === space.uuid;
  }

  // === COMPATIBILITY CHECKS ===

  isCompatible(space: LearningSpace): boolean {
    if (!this.sessionType) return true;

    // Verificar tipo de espacio
    if (this.sessionType === 'THEORY' && space.teachingType.name !== 'THEORY') {
      return false;
    }

    if (this.sessionType === 'PRACTICE' && space.teachingType.name !== 'PRACTICE') {
      return false;
    }

    // Verificar especialidad si es requerida
    if (this.preferredSpecialty && space.specialty?.name !== this.preferredSpecialty) {
      return false;
    }

    return true;
  }

  hasInsufficientCapacity(space: LearningSpace): boolean {
    return space.capacity < this.requiredCapacity;
  }

  hasHighOccupancy(space: LearningSpace): boolean {
    const occupancy = this.getSpaceOccupancy(space);
    return occupancy ? occupancy.occupancyRate > 80 : false;
  }

  // === SPACE INFORMATION ===

  getSpaceIcon(space: LearningSpace): string {
    if (space.teachingType.name === 'PRACTICE') {
      return 'science';
    }
    return 'meeting_room';
  }

  getSpaceIconColor(space: LearningSpace): string {
    if (!this.isCompatible(space)) return 'warn';
    if (this.hasInsufficientCapacity(space)) return 'warn';
    return 'primary';
  }

  getSpaceTypeText(space: LearningSpace): string {
    return space.teachingType.name === 'THEORY' ? 'Teórica' : 'Laboratorio';
  }

  getSessionTypeText(): string {
    if (!this.sessionType) return '';
    return this.sessionType === 'THEORY' ? 'teórica' : 'práctica';
  }

  getSessionTypeColor(): string {
    if (!this.sessionType) return 'primary';
    return this.sessionType === 'THEORY' ? 'primary' : 'warn';
  }

  getSessionTypeIcon(): string {
    if (!this.sessionType) return 'room';
    return this.sessionType === 'THEORY' ? 'menu_book' : 'science';
  }

  // === CAPACITY METHODS ===

  getCapacityUtilization(space: LearningSpace): number {
    if (this.requiredCapacity === 0) return 0;
    return Math.min(100, (this.requiredCapacity / space.capacity) * 100);
  }

  // === OCCUPANCY METHODS ===

  getSpaceOccupancy(space: LearningSpace): SpaceOccupancy | null {
    return this.spaceOccupancies.get(space.uuid) || null;
  }

  getOccupancyPercentage(space: LearningSpace): number {
    const occupancy = this.getSpaceOccupancy(space);
    return occupancy ? Math.round(occupancy.occupancyRate) : 0;
  }

  getOccupancyClass(space: LearningSpace): string {
    const percentage = this.getOccupancyPercentage(space);
    if (percentage <= 50) return 'low';
    if (percentage <= 80) return 'medium';
    return 'high';
  }

  getOccupancyTooltip(space: LearningSpace): string {
    const occupancy = this.getSpaceOccupancy(space);
    if (!occupancy) return 'Sin datos de ocupación';

    return `Ocupación: ${occupancy.occupiedHours}/${occupancy.totalHours} horas semanales (${Math.round(occupancy.occupancyRate)}%)`;
  }

  getSpaceOccupancyHours(space: LearningSpace): number {
    const occupancy = this.getSpaceOccupancy(space);
    return occupancy ? occupancy.occupiedHours : 0;
  }

  getTotalWeeklyHours(): number {
    return 45; // 9 horas por día * 5 días
  }

  getDayOccupancy(space: LearningSpace, day: string): number {
    // Simular ocupación por día - en producción usar datos reales
    return Math.random() * 100;
  }

  getDayOccupancyClass(space: LearningSpace, day: string): string {
    const percentage = this.getDayOccupancy(space, day);
    if (percentage <= 50) return 'low';
    if (percentage <= 80) return 'medium';
    return 'high';
  }

  // === EVENT HANDLERS ===

  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  toggleOccupancy(enabled: boolean): void {
    this.showOccupancy = enabled;
    if (enabled) {
      this.loadSpaceData();
    }
  }

  clearFilters(): void {
    this.searchControl.reset();
    this.capacityControl.setValue(30);
    this.requiredCapacity = 30;
    this.filterSpaces();
  }

  viewSpaceSchedule(space: LearningSpace): void {
    // Emitir evento para ver horario del espacio
    console.log('Ver horario de:', space.name);
  }

  viewSpaceDetails(space: LearningSpace): void {
    // Emitir evento para ver detalles del espacio
    console.log('Ver detalles de:', space.name);
  }

  // === TRACK BY ===

  trackBySpaceId(index: number, space: LearningSpace): string {
    return space.uuid;
  }
}
