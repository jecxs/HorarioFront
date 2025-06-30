// schedule-by-group.component.ts - Versión Mejorada
import { Component, OnInit, OnDestroy, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
// Services
import { ClassSessionService } from '../../services/class-session.service';
import {StudentGroupService, StudentGroup, Career} from '../../../student-groups/services/student-group.service';
import { TimeSlotService, TimeSlot } from '../../../time-slots/services/time-slot.service';
import { PeriodService } from '../../../periods/services/period.service';

// Agregar estos imports a los existentes
import { CourseService } from '../../../courses/services/course.service';
import { CourseMetadataService } from '../../services/course-metadata.service';
import { CourseMetadataHeaderComponent } from '../course-metadata-header/course-metadata-header.component';
import { CourseResponse } from '../../models/class-session.model';


// Models
import {
  ClassSessionResponse,
  DayOfWeek,
  WORKING_DAYS,
  DAY_NAMES,
  ScheduleHourRow,
  ScheduleCell,
  TeachingHourResponse,
  TimeSlotHelper,

} from '../../models/class-session.model';

// Components
import { AssignmentDialogComponent, AssignmentDialogData } from '../assignment-dialog/assignment-dialog.component';

@Component({
  selector: 'app-schedule-by-group',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    CourseMetadataHeaderComponent
  ],
  templateUrl: './schedule-by-group.component.html',
  styleUrls: ['./schedule-by-group.component.scss']
})
export class ScheduleByGroupComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private classSessionService = inject(ClassSessionService);
  private studentGroupService = inject(StudentGroupService);
  private timeSlotService = inject(TimeSlotService);
  private periodService = inject(PeriodService);
  private courseService = inject(CourseService); // ✅ AGREGAR
  private courseMetadataService = inject(CourseMetadataService); // ✅ AGREGAR
  private route = inject(ActivatedRoute);
  private originalModalitiesOptions: any[] = [];
  private originalCareersOptions: Career[] = [];
  private originalStudentGroups: StudentGroup[] = [];
  Math = Math;

  // ✅ NUEVAS PROPIEDADES para colapsar turnos
  collapsedTimeSlots: Set<string> = new Set(); // UUIDs de turnos colapsados
  showCollapseControls = true; // Para mostrar/ocultar controles

  // Form controls
  groupControl = new FormControl<string>('');

  // Data
  studentGroups: StudentGroup[] = [];
  timeSlots: TimeSlot[] = [];
  sessions: ClassSessionResponse[] = [];
  scheduleHourRows: ScheduleHourRow[] = [];
  groupCourses: CourseResponse[] = []; // ✅ AGREGAR
  loadingCourses = false; // ✅ AGREGAR

  //filtros
  modalitiesOptions: any[] = [];
  careersOptions: Career[] = [];
  cyclesOptions: number[] = [];
  filteredGroups: StudentGroup[] = [];

  // ✅ AGREGAR: Form controls para filtros
  modalityFilter = new FormControl<string>('');
  careerFilter = new FormControl<string>('');
  cycleFilter = new FormControl<number | ''>('');
  searchFilter = new FormControl<string>('');


// ✅ AGREGAR: Estado de filtros
  showFilters = false;
  filtersExpanded = false;

  // State
  selectedGroup: StudentGroup | null = null;
  loading = false;
  workingDays = WORKING_DAYS.filter(d => d !== DayOfWeek.SUNDAY);

  constructor(
  ) {
  }

  ngOnInit(): void {
    this.listenToPeriodChanges();
    this.loadInitialData();
    this.setupGroupSelection();
    this.handleQueryParams();
  }


  closeFilters(): void {
    this.filtersExpanded = false;
  }
  /**
   * Obtiene el nombre de la modalidad por UUID
   */
  getModalityName(modalityUuid: string): string {
    const modality = this.originalModalitiesOptions.find(m => m.uuid === modalityUuid);
    return modality ? modality.name : '';
  }
  /**
   * Obtiene el nombre de la carrera por UUID
   */
  getCareerName(careerUuid: string): string {
    const career = this.careersOptions.find(c => c.uuid === careerUuid);
    return career ? career.name : '';
  }

  // ✅ NUEVO MÉTODO
  private listenToPeriodChanges(): void {
    // Escuchar el evento global de cambio de periodo
    window.addEventListener('period-changed', () => {
      this.onPeriodChanged();
    });

    // También escuchar cambios del servicio
    this.periodService.currentPeriod$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onPeriodChanged();
      });
  }

  // ✅ NUEVO MÉTODO
  private onPeriodChanged(): void {
    console.log('🔄 Period changed, clearing all data...');

    // ✅ Limpiar datos actuales
    this.clearGroupData();

    // ✅ Limpiar cache del servicio
    this.classSessionService.clearSessionsForNewPeriod();

    // ✅ Recargar grupos del nuevo periodo
    this.loadStudentGroups();

    // ✅ Si había un grupo seleccionado, limpiar selección
    if (this.selectedGroup) {
      this.groupControl.setValue('');
      this.selectedGroup = null;
      this.snackBar.open(
        'Periodo cambiado. Seleccione un grupo del nuevo periodo.',
        'Entendido',
        { duration: 4000 }
      );
    }
  }

  // ✅ NUEVO MÉTODO
  private verifySelectedGroup(): void {
    if (!this.selectedGroup) return;

    // Buscar el grupo en la nueva lista
    const groupExists = this.studentGroups.find(g => g.uuid === this.selectedGroup!.uuid);

    if (!groupExists) {
      // El grupo no existe en el nuevo periodo, limpiar selección
      this.groupControl.setValue('');
      this.snackBar.open(
        'El grupo seleccionado no pertenece al periodo actual',
        'Entendido',
        { duration: 3000 }
      );
    }
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // ✅ Limpiar metadatos al destruir el componente
    this.courseMetadataService.clearMetadata();
  }

  private loadInitialData(): void {
    const currentPeriod = this.periodService.getCurrentPeriod();
    if (!currentPeriod) {
      // Mostrar mensaje y redirigir a selección de periodo
      this.snackBar.open(
        'Debe seleccionar un periodo académico',
        'Seleccionar',
        { duration: 5000 }
      );
      return;
    }

    this.loadStudentGroups();
    this.loadTimeSlots();
  }

  private loadStudentGroups(): void {
    // ✅ CARGAR DATOS PARA FILTROS
    combineLatest([
      this.studentGroupService.getAllGroups(),
      this.studentGroupService.getAllCareers(),
      this.studentGroupService.getAllModalities()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([groupsResponse, careersResponse, modalitiesResponse]) => {
          // ✅ GUARDAR DATOS ORIGINALES
          this.originalStudentGroups = Array.isArray(groupsResponse.data) ? groupsResponse.data : [groupsResponse.data];
          this.originalCareersOptions = Array.isArray(careersResponse.data) ? careersResponse.data : [careersResponse.data];
          this.originalModalitiesOptions = Array.isArray(modalitiesResponse.data) ? modalitiesResponse.data : [modalitiesResponse.data];

          // ✅ INICIALIZAR LISTAS MOSTRADAS
          this.studentGroups = [...this.originalStudentGroups];
          this.careersOptions = [...this.originalCareersOptions];
          this.modalitiesOptions = [...this.originalModalitiesOptions];

          console.log('📊 Datos cargados:');
          console.log('  - Grupos:', this.originalStudentGroups.length);
          console.log('  - Carreras:', this.originalCareersOptions.length);
          console.log('  - Modalidades:', this.originalModalitiesOptions.length);

          // ✅ CONFIGURAR FILTROS Y APLICAR FILTRADO INICIAL
          this.setupFilters();
          this.applyGroupFilters();
        },
        error: (error) => {
          console.error('Error loading groups:', error);
          this.showSnackBar('Error al cargar los grupos', 'error');
        }
      });
  }
// ✅ AGREGAR: Configurar filtros reactivos
  private setupFilters(): void {
    // Filtro en cascada: modalidad -> carrera -> ciclo
    this.modalityFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(modalityUuid => {
        this.careerFilter.setValue('');
        this.cycleFilter.setValue('');
        this.updateCareerOptions(modalityUuid || undefined);
        this.applyGroupFilters();
      });

    this.careerFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(careerUuid => {
        this.cycleFilter.setValue('');
        this.updateCycleOptions(careerUuid || undefined);
        this.applyGroupFilters();
      });

    this.cycleFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyGroupFilters();
      });

    // Búsqueda con debounce
    this.searchFilter.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyGroupFilters();
      });
  }

// ✅ AGREGAR: Actualizar opciones de carrera basado en modalidad
  private updateCareerOptions(modalityUuid?: string): void {
    console.log('🔄 Actualizando carreras para modalidad:', modalityUuid);

    if (!modalityUuid) {
      // Si no hay modalidad seleccionada, mostrar todas las carreras
      this.careersOptions = [...this.originalCareersOptions];
      this.cyclesOptions = [];
      console.log('  ✅ Mostrando todas las carreras:', this.careersOptions.length);
      return;
    }

    // ✅ FILTRAR desde la lista ORIGINAL
    this.careersOptions = this.originalCareersOptions.filter(career => {
      const belongsToModality = career.modality.uuid === modalityUuid;
      if (belongsToModality) {
        console.log(`  ✅ Carrera incluida: ${career.name}`);
      }
      return belongsToModality;
    });

    this.cyclesOptions = [];
    console.log(`  📋 Total carreras filtradas: ${this.careersOptions.length}`);
  }

  private updateCycleOptions(careerUuid?: string): void {
    console.log('🔄 Actualizando ciclos para carrera:', careerUuid);

    this.cyclesOptions = [];

    if (!careerUuid) {
      console.log('  ⚠️ No hay carrera seleccionada');
      return;
    }

    const selectedCareer = this.careersOptions.find(c => c.uuid === careerUuid);
    if (selectedCareer) {
      this.cyclesOptions = selectedCareer.cycles
        .map(cycle => cycle.number)
        .sort((a, b) => a - b);
      console.log(`  ✅ Ciclos encontrados: [${this.cyclesOptions.join(', ')}]`);
    } else {
      console.log('  ❌ Carrera no encontrada en opciones filtradas');
    }
  }

  private applyGroupFilters(): void {
    console.log('🔍 Aplicando filtros de grupos...');
    console.log('  📊 Filtros activos:');
    console.log('    - Modalidad:', this.modalityFilter.value || 'ninguna');
    console.log('    - Carrera:', this.careerFilter.value || 'ninguna');
    console.log('    - Ciclo:', this.cycleFilter.value || 'ninguno');
    console.log('    - Búsqueda:', this.searchFilter.value || 'ninguna');

    // ✅ PARTIR SIEMPRE DE LA LISTA ORIGINAL
    let filtered = [...this.originalStudentGroups];
    console.log(`  📋 Grupos iniciales: ${filtered.length}`);

    // Filtro por modalidad
    if (this.modalityFilter.value) {
      const modalityUuid = this.modalityFilter.value;
      const previousCount = filtered.length;

      filtered = filtered.filter(group => {
        // ✅ BUSCAR LA CARRERA EN LA LISTA ORIGINAL
        const career = this.originalCareersOptions.find(c => c.uuid === group.careerUuid);
        const belongsToModality = career && career.modality.uuid === modalityUuid;

        if (belongsToModality) {
          console.log(`    ✅ Grupo incluido: ${group.name} (${career.name})`);
        }

        return belongsToModality;
      });

      console.log(`  🏫 Filtro modalidad: ${previousCount} → ${filtered.length}`);
    }

    // Filtro por carrera
    if (this.careerFilter.value) {
      const previousCount = filtered.length;
      filtered = filtered.filter(group => {
        const belongsToCareer = group.careerUuid === this.careerFilter.value;
        if (belongsToCareer) {
          console.log(`    ✅ Grupo incluido: ${group.name}`);
        }
        return belongsToCareer;
      });
      console.log(`  🎓 Filtro carrera: ${previousCount} → ${filtered.length}`);
    }

    // Filtro por ciclo
    if (this.cycleFilter.value) {
      const previousCount = filtered.length;
      filtered = filtered.filter(group => {
        const belongsToCycle = group.cycleNumber === this.cycleFilter.value;
        if (belongsToCycle) {
          console.log(`    ✅ Grupo incluido: ${group.name} (Ciclo ${group.cycleNumber})`);
        }
        return belongsToCycle;
      });
      console.log(`  📚 Filtro ciclo: ${previousCount} → ${filtered.length}`);
    }

    // Filtro por búsqueda de texto
    if (this.searchFilter.value) {
      const searchTerm = this.searchFilter.value.toLowerCase();
      const previousCount = filtered.length;

      filtered = filtered.filter(group => {
        const nameMatch = group.name.toLowerCase().includes(searchTerm);
        const careerMatch = group.careerName.toLowerCase().includes(searchTerm);
        const matches = nameMatch || careerMatch;

        if (matches) {
          console.log(`    ✅ Grupo incluido: ${group.name} (búsqueda: "${searchTerm}")`);
        }

        return matches;
      });

      console.log(`  🔍 Filtro búsqueda: ${previousCount} → ${filtered.length}`);
    }

    this.filteredGroups = filtered;
    console.log(`  ✅ Resultado final: ${this.filteredGroups.length} grupos`);
  }

// ✅ AGREGAR: Toggle de filtros
  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

// ✅ AGREGAR: Limpiar filtros
  clearAllFilters(): void {
    console.log('🧹 Limpiando todos los filtros...');

    this.modalityFilter.setValue('');
    this.careerFilter.setValue('');
    this.cycleFilter.setValue('');
    this.searchFilter.setValue('');

    // ✅ RESTAURAR LISTAS COMPLETAS
    this.careersOptions = [...this.originalCareersOptions];
    this.cyclesOptions = [];

    console.log('  ✅ Filtros limpiados y listas restauradas');
  }

// ✅ AGREGAR: Obtener conteo de filtros activos
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.modalityFilter.value) count++;
    if (this.careerFilter.value) count++;
    if (this.cycleFilter.value) count++;
    if (this.searchFilter.value) count++;
    return count;
  }


  // ✅ AGREGAR nuevo método
  private handleQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['groupUuid']) {
          // Seleccionar el grupo desde queryParams
          this.groupControl.setValue(params['groupUuid']);

          // Mostrar mensaje de contexto
          this.snackBar.open(
            'Navegado desde un conflicto de horario. Revise las asignaciones del docente.',
            'Entendido',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['info-snackbar']
            }
          );
        }
      });
  }

  private loadTimeSlots(): void {
    this.timeSlotService.getAllTimeSlots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.timeSlots = Array.isArray(response.data) ? response.data : [response.data];
          this.buildScheduleGrid();
        },
        error: (error) => {
          console.error('Error loading time slots:', error);
          this.showSnackBar('Error al cargar los turnos', 'error');
        }
      });
  }

  private setupGroupSelection(): void {
    this.groupControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        debounceTime(150),
        takeUntil(this.destroy$)
      )
      .subscribe(groupUuid => {
        if (groupUuid) {
          this.selectedGroup = this.studentGroups.find(g => g.uuid === groupUuid) || null;
          if (this.selectedGroup) {
            // ✅ Cargar datos del grupo Y sus cursos
            this.loadGroupData(groupUuid);
          }
        } else {
          // ✅ Limpiar cuando no hay grupo seleccionado
          this.clearGroupData();
        }
      });
  }

  // ✅ NUEVO MÉTODO: Cargar todos los datos del grupo de manera coordinada
  private loadGroupData(groupUuid: string): void {
    this.loading = true;
    this.loadingCourses = true;

    console.log('🔄 Loading complete group data for:', groupUuid);

    // Combinar carga de sesiones y cursos
    combineLatest([
      this.classSessionService.getSessionsByGroup(groupUuid),
      this.loadGroupCourses(groupUuid)
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([sessionsResponse, courses]: [any, CourseResponse[]]) => { // ✅ TIPADO CORRECTO
          console.log('📚 Group data loaded successfully');

          // Actualizar sesiones
          this.sessions = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [sessionsResponse.data];

          // Actualizar cursos
          this.groupCourses = courses;

          // ✅ CALCULAR Y ACTUALIZAR METADATOS
          this.updateMetadata();

          // Construir grid
          this.buildScheduleGrid();

          this.loading = false;
          this.loadingCourses = false;

          console.log('✅ Group data processing complete');
        },
        error: (error: any) => { // ✅ TIPADO CORRECTO
          console.error('❌ Error loading group data:', error);
          this.showSnackBar('Error al cargar los datos del grupo', 'error');
          this.loading = false;
          this.loadingCourses = false;
        }
      });
  }

// ✅ NUEVO MÉTODO: Cargar cursos del grupo seleccionado
  // ✅ NUEVO MÉTODO: Cargar cursos del grupo seleccionado
  private loadGroupCourses(groupUuid: string): Promise<CourseResponse[]> {
    return new Promise((resolve, reject) => {
      if (!this.selectedGroup) {
        resolve([]);
        return;
      }

      console.log('📖 Loading courses for group:', this.selectedGroup.name);
      console.log('   - Cycle:', this.selectedGroup.cycleNumber);
      console.log('   - Career UUID:', this.selectedGroup.careerUuid);

      this.courseService.getAllCourses()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => { // ✅ TIPADO CORRECTO
            const allCourses = Array.isArray(response.data) ? response.data : [response.data];

            // ✅ Filtrar cursos por ciclo Y carrera
            const filteredCourses = allCourses.filter((course: CourseResponse) => { // ✅ TIPADO CORRECTO
              const sameCycleNumber = course.cycle.number === this.selectedGroup?.cycleNumber;
              const sameCareer = course.career.uuid === this.selectedGroup?.careerUuid;
              return sameCycleNumber && sameCareer;
            });

            console.log(`📚 Found ${filteredCourses.length} courses for this group`);
            filteredCourses.forEach((course: CourseResponse) => { // ✅ TIPADO CORRECTO
              console.log(`   - ${course.name} (${course.weeklyTheoryHours}h teoría, ${course.weeklyPracticeHours}h práctica)`);
            });

            resolve(filteredCourses);
          },
          error: (error: any) => { // ✅ TIPADO CORRECTO
            console.error('Error loading courses:', error);
            reject(error);
          }
        });
    });
  }

// ✅ NUEVO MÉTODO: Actualizar metadatos cuando cambian los datos
  private updateMetadata(): void {
    if (!this.selectedGroup || !this.groupCourses) {
      console.log('⚠️ Cannot update metadata: missing group or courses');
      return;
    }

    console.log('📊 Updating course metadata...');
    console.log('   - Group:', this.selectedGroup.name);
    console.log('   - Courses:', this.groupCourses.length);
    console.log('   - Sessions:', this.sessions.length);

    this.courseMetadataService.updateGroupCoursesMetadata(
      this.selectedGroup,
      this.groupCourses,
      this.sessions
    );
  }

// ✅ NUEVO MÉTODO: Limpiar datos cuando no hay grupo
  private clearGroupData(): void {
    this.sessions = [];
    this.groupCourses = [];
    this.scheduleHourRows = [];
    this.courseMetadataService.clearMetadata();
    this.collapsedTimeSlots.clear();
  }


  private buildScheduleGrid(): void {
    if (!this.timeSlots || this.timeSlots.length === 0) {
      this.scheduleHourRows = [];
      return;
    }

    const processedTimeSlots = TimeSlotHelper.sortTimeSlots(this.timeSlots);
    const hourRows: ScheduleHourRow[] = [];


    processedTimeSlots.forEach(timeSlot => {
      timeSlot.sortedHours.forEach((hour, hourIndex) => {
        const row: ScheduleHourRow = {
          teachingHour: hour,
          timeSlot: {
            uuid: timeSlot.uuid,
            name: timeSlot.name,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime
          },
          isFirstHourOfTimeSlot: hourIndex === 0,
          isLastHourOfTimeSlot: hourIndex === timeSlot.sortedHours.length - 1,
          hourIndexInTimeSlot: hourIndex,
          totalHoursInTimeSlot: timeSlot.sortedHours.length,
          cells: {}
        };

        this.workingDays.forEach(day => {
          row.cells[day] = {
            teachingHour: hour,
            session: this.findSessionForHour(day, hour),
            isAvailable: this.isCellAvailable(day, hour),
            isSelected: false
          };
        });

        hourRows.push(row);
      });
    });

    this.scheduleHourRows = hourRows;
    if (this.selectedGroup) {
      this.autoCollapseEmptyTimeSlots();
    }
  }

  private findSessionForHour(day: DayOfWeek, hour: TeachingHourResponse): ClassSessionResponse | undefined {
    return this.sessions.find(session =>
      session.dayOfWeek === day &&
      session.teachingHours.some(h => h.uuid === hour.uuid)
    );
  }

  private isCellAvailable(day: DayOfWeek, hour: TeachingHourResponse): boolean {
    return !this.findSessionForHour(day, hour);
  }

  // ===== MÉTODOS DE UI MEJORADOS =====

  getDayName(day: DayOfWeek): string {
    return DAY_NAMES[day];
  }

  getDayIcon(day: DayOfWeek): string {
    const dayIcons: Record<DayOfWeek, string> = {
      [DayOfWeek.MONDAY]: 'today',
      [DayOfWeek.TUESDAY]: 'event',
      [DayOfWeek.WEDNESDAY]: 'schedule',
      [DayOfWeek.THURSDAY]: 'access_time',
      [DayOfWeek.FRIDAY]: 'event_available',
      [DayOfWeek.SATURDAY]: 'weekend',
      [DayOfWeek.SUNDAY]: 'calendar_month'
    };
    return dayIcons[day] || 'calendar_month';
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  getCellForDay(row: ScheduleHourRow, day: DayOfWeek): ScheduleCell | undefined {
    return row.cells[day];
  }

  // ✅ NUEVO: Tooltip mejorado para celdas de tiempo con información del turno
  getTimeSlotTooltip(row: ScheduleHourRow): string {
    return `Turno: ${row.timeSlot.name}\n` +
      `Horario: ${this.formatTime(row.timeSlot.startTime)} - ${this.formatTime(row.timeSlot.endTime)}\n` +
      `Hora ${row.teachingHour.orderInTimeSlot} de ${row.totalHoursInTimeSlot}\n` +
      `Duración: ${row.teachingHour.durationMinutes} minutos`;
  }

  // ✅ MEJORADO: Tooltip más informativo para celdas de sesión
  getCellTooltip(cell: ScheduleCell): string {
    if (cell.session) {
      const session = cell.session;
      return `📚 ${session.course.name}\n` +
        `👨‍🏫 ${session.teacher.fullName}\n` +
        `🏫 ${session.learningSpace.name}\n` +
        `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}\n` +
        `📝 Tipo: ${session.sessionType.name === 'THEORY' ? 'Teórica' : 'Práctica'}\n` +
        `⏱️ ${session.totalHours} hora(s) pedagógica(s)`;
    }

    if (cell.isAvailable) {
      return `➕ Click para asignar clase\n` +
        `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}\n` +
        `⏱️ Duración: ${cell.teachingHour.durationMinutes} minutos`;
    }

    return `🚫 No disponible\n` +
      `⏰ ${this.formatTime(cell.teachingHour.startTime)} - ${this.formatTime(cell.teachingHour.endTime)}`;
  }

  getSessionCardClasses(session: ClassSessionResponse): string {
    return session.sessionType.name === 'THEORY' ? 'session-card-theory' : 'session-card-practice';
  }

  getSessionTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  getTotalHours(): number {
    return this.sessions.reduce((total, session) => total + session.totalHours, 0);
  }

  // ✅ ELIMINADO: Ya no necesitamos mostrar nombres de turnos en filas
  // shouldShowTimeSlotName(row: ScheduleHourRow): boolean {
  //   return row.isFirstHourOfTimeSlot;
  // }

  // ✅ MEJORADO: Método para acortar nombres largos con mejor lógica
  getShortName(fullName: string): string {
    if (!fullName) return '';

    const names = fullName.trim().split(' ');
    if (names.length <= 2) return fullName;

    // Tomar primer nombre y primer apellido
    return `${names[0]} ${names[names.length - 1]}`;
  }





  // ===== MÉTODOS PARA COLAPSAR TURNOS =====

  /**
   * Verifica si un turno tiene clases asignadas
   */
  private timeSlotHasSessions(timeSlotUuid: string): boolean {
    return this.sessions.some(session =>
      session.teachingHours.some(hour =>
        this.timeSlots.find(ts => ts.uuid === timeSlotUuid)?.teachingHours?.some(th => th.uuid === hour.uuid)
      )
    );
  }

  /**
   * Colapsa automáticamente turnos sin clases
   */
  private autoCollapseEmptyTimeSlots(): void {
    this.collapsedTimeSlots.clear();

    this.timeSlots.forEach(timeSlot => {
      if (!this.timeSlotHasSessions(timeSlot.uuid)) {
        this.collapsedTimeSlots.add(timeSlot.uuid);
      }
    });
  }

  /**
   * Toggle del estado de colapso de un turno
   */
  toggleTimeSlotCollapse(timeSlotUuid: string): void {
    if (this.collapsedTimeSlots.has(timeSlotUuid)) {
      this.collapsedTimeSlots.delete(timeSlotUuid);
    } else {
      this.collapsedTimeSlots.add(timeSlotUuid);
    }
  }

  /**
   * Verifica si un turno está colapsado
   */
  isTimeSlotCollapsed(timeSlotUuid: string): boolean {
    return this.collapsedTimeSlots.has(timeSlotUuid);
  }

  /**
   * Verifica si una fila debe mostrarse (no está en un turno colapsado)
   */
  shouldShowRow(row: ScheduleHourRow): boolean {
    return !this.isTimeSlotCollapsed(row.timeSlot.uuid);
  }

  /**
   * Obtiene el resumen de un turno colapsado
   */
  getCollapsedTimeSlotSummary(timeSlotUuid: string): string {
    const timeSlot = this.timeSlots.find(ts => ts.uuid === timeSlotUuid);
    if (!timeSlot) return '';

    const sessionsCount = this.sessions.filter(session =>
      session.teachingHours.some(hour =>
        timeSlot.teachingHours?.some(th => th.uuid === hour.uuid)
      )
    ).length;

    return sessionsCount > 0 ? `${sessionsCount} clases` : 'Sin clases';
  }

  /**
   * Expande todos los turnos
   */
  expandAllTimeSlots(): void {
    this.collapsedTimeSlots.clear();
  }

  /**
   * Colapsa todos los turnos vacíos
   */
  collapseEmptyTimeSlots(): void {
    this.autoCollapseEmptyTimeSlots();
  }

  getSortedTimeSlots(): any[] {
    return [...this.timeSlots].sort((a, b) => {
      // Convertir tiempo de inicio a minutos para comparar
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const aStartMinutes = timeToMinutes(a.startTime);
      const bStartMinutes = timeToMinutes(b.startTime);

      return aStartMinutes - bStartMinutes;
    });
  }

  // ===== MÉTODOS DE ACCIÓN MEJORADOS =====

  onCellClick(row: ScheduleHourRow, day: DayOfWeek, cell: ScheduleCell): void {
    if (!cell.session && cell.isAvailable && this.selectedGroup) {
      const dialogData: AssignmentDialogData = {
        mode: 'create',
        studentGroup: this.selectedGroup,
        dayOfWeek: day,
        teachingHours: [cell.teachingHour],
        timeSlotUuid: row.timeSlot.uuid
      };

      const dialogRef = this.dialog.open(AssignmentDialogComponent, {
        width: '700px',
        maxWidth: '90vw',
        data: dialogData,
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.showSnackBar('Clase asignada exitosamente', 'success');
          this.loadGroupData(this.selectedGroup!.uuid);
        }
      });
    }
  }

  editSession(session: ClassSessionResponse): void {
    if (!this.selectedGroup) return;

    const dialogData: AssignmentDialogData = {
      mode: 'edit',
      studentGroup: this.selectedGroup,
      dayOfWeek: session.dayOfWeek,
      teachingHours: session.teachingHours,
      sessionToEdit: session
    };

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase actualizada exitosamente', 'success');
        // ✅ Recargar datos completos para actualizar metadatos
        this.loadGroupData(this.selectedGroup!.uuid);
      }
    });
  }

  deleteSession(session: ClassSessionResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de eliminar la clase de "${session.course.name}"?\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performDeleteSession(session);
      }
    });
  }

  private performDeleteSession(session: ClassSessionResponse): void {
    this.classSessionService.deleteSession(session.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSnackBar('Clase eliminada exitosamente', 'success');
          this.loadGroupData(this.selectedGroup!.uuid);
        },
        error: (error) => {
          console.error('Error deleting session:', error);
          this.showSnackBar('Error al eliminar la clase', 'error');
        }
      });
  }

  openAssignmentDialog(): void {
    if (!this.selectedGroup) return;

    const dialogData: AssignmentDialogData = {
      mode: 'create',
      studentGroup: this.selectedGroup
    };

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSnackBar('Clase asignada exitosamente', 'success');
        this.loadGroupData(this.selectedGroup!.uuid);
      }
    });
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000, // Aumentado para mejor UX
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/horarios']);
  }
}





// ===== COMPONENTE DE CONFIRMACIÓN MEJORADO =====
interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="p-6">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center" [class]="getIconBackgroundClass()">
          <mat-icon [class]="getIconClass()">{{ getIcon() }}</mat-icon>
        </div>
        <h2 class="text-lg font-semibold" [class]="getTitleClass()">{{ data.title }}</h2>
      </div>

      <p class="text-slate-600 mb-6 whitespace-pre-line leading-relaxed">{{ data.message }}</p>

      <div class="flex space-x-3 justify-end">
        <button
          mat-button
          (click)="onCancel()"
          class="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors">
          {{ data.cancelText }}
        </button>
        <button
          mat-raised-button
          [color]="getButtonColor()"
          (click)="onConfirm()"
          class="px-6 py-2 rounded-lg">
          {{ data.confirmText }}
        </button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule]
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,

  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getTitleClass(): string {
    const classes = {
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600'
    };
    return classes[this.data.type] || 'text-slate-800';
  }

  getButtonColor(): string {
    const colors = {
      danger: 'warn',
      warning: 'accent',
      info: 'primary'
    };
    return colors[this.data.type] || 'primary';
  }

  getIcon(): string {
    const icons = {
      danger: 'warning',
      warning: 'info',
      info: 'help'
    };
    return icons[this.data.type] || 'help';
  }

  getIconClass(): string {
    const classes = {
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600'
    };
    return classes[this.data.type] || 'text-slate-600';
  }

  getIconBackgroundClass(): string {
    const classes = {
      danger: 'bg-red-100',
      warning: 'bg-yellow-100',
      info: 'bg-blue-100'
    };
    return classes[this.data.type] || 'bg-slate-100';
  }

}
