// src/app/features/docentes/components/teacher-assigned-classes/teacher-assigned-classes.component.ts
import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {combineLatest, Subject, takeUntil} from 'rxjs';
import { finalize } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import {
  MatExpansionModule,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription
} from '@angular/material/expansion';

// Services
import { ClassSessionService } from '../../../schedule-assignment/services/class-session.service';
import { AuthService } from '../../../../shared/services/auth.service';

// Models
import {
  ClassSessionResponse,
  DayOfWeek,
  DAY_NAMES,
  WORKING_DAYS,
  ScheduleHourRow,
  ScheduleCell
} from '../../../schedule-assignment/models/class-session.model';
import { TeacherResponse } from '../../models/docente.model';
import {TeachingHour, TimeSlot, TimeSlotService} from '../../../time-slots/services/time-slot.service';

// ✅ NUEVA Interface para manejar sesiones multi-hora en el grid
interface SessionGridCell {
  teachingHour: TeachingHour;
  session?: ClassSessionResponse;
  isFirstHourOfSession: boolean;
  isPartOfMultiHourSession: boolean;
  sessionSpanHours: number;
  isAvailable: boolean;
  isSelected: boolean;
}

// ✅ Interface mejorada para el grid semanal
interface WeeklyScheduleGrid {
  timeSlots: TimeSlot[];
  hourRows: ScheduleHourRow[];
}

@Component({
  selector: 'app-teacher-assigned-classes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatExpansionModule,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
  ],
  templateUrl: `./teacher-assigned-classes.component.html`,
  styleUrls: ['./teacher-assigned-classes.component.scss']
})
export class TeacherAssignedClassesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private classSessionService = inject(ClassSessionService);
  private timeSlotService = inject(TimeSlotService);
  private authService = inject(AuthService);

  @Input() teacher: TeacherResponse | null = null;

  sessions: ClassSessionResponse[] = [];
  loading = false;

  // ✅ CORREGIDO: Definir explícitamente el orden correcto de días laborables
  workingDays: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY
  ];

  sessionsByDay: { [key in DayOfWeek]?: ClassSessionResponse[] } = {};
  scheduleGrid: WeeklyScheduleGrid = {
    timeSlots: [],
    hourRows: []
  };

  ngOnInit(): void {
    if (this.teacher) {
      this.loadTeacherData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeacherData(): void {
    if (!this.teacher) return;

    this.loading = true;
    console.log('🔄 Loading teacher schedule data:', this.teacher.uuid);

    // Cargar tanto las sesiones como los time slots
    combineLatest([
      this.classSessionService.getSessionsByTeacher(this.teacher.uuid),
      this.timeSlotService.getAllTimeSlots()
    ]).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ([sessionsResponse, timeSlotsResponse]) => {
        // Procesar sesiones
        this.sessions = Array.isArray(sessionsResponse.data)
          ? sessionsResponse.data
          : [sessionsResponse.data];

        // ✅ NUEVO: Debug de sesiones recibidas
        this.debugSessions();

        // Procesar time slots
        const timeSlots: TimeSlot[] = Array.isArray(timeSlotsResponse.data)
          ? timeSlotsResponse.data
          : [timeSlotsResponse.data];

        // Construir el grid
        this.buildScheduleGrid(timeSlots);
        this.groupSessionsByDay();

        // ✅ NUEVO: Debug final del grid construido
        this.debugFinalGrid();

        console.log('✅ Teacher schedule data loaded:', {
          sessions: this.sessions.length,
          timeSlots: timeSlots.length,
          hourRows: this.scheduleGrid.hourRows.length
        });
      },
      error: (error) => {
        console.error('❌ Error loading teacher schedule data:', error);
        this.showSnackBar('Error al cargar el horario de clases', 'error');
        this.sessions = [];
      }
    });
  }

  // ✅ NUEVO MÉTODO: Debug de sesiones para identificar el problema
  private debugSessions(): void {
    console.log('🔍 DEBUG - Sesiones cargadas:');
    this.sessions.forEach((session, index) => {
      console.log(`  Sesión ${index + 1}:`, {
        course: session.course.name,
        day: session.dayOfWeek,
        dayName: this.getDayName(session.dayOfWeek),
        hours: session.teachingHours.map(h => `${h.startTime}-${h.endTime}`),
        totalHours: session.totalHours
      });
    });

    console.log('🔍 DEBUG - Días laborables definidos:');
    this.workingDays.forEach((day, index) => {
      console.log(`  Columna ${index + 1}: ${this.getDayName(day)} (${day})`);
    });
  }

  // ✅ NUEVO MÉTODO: Debug final del grid construido
  private debugFinalGrid(): void {
    console.log('🎯 DEBUG FINAL - Grid construido:');

    // Verificar algunas filas del grid
    const firstFewRows = this.scheduleGrid.hourRows.slice(0, 4);
    firstFewRows.forEach((row, rowIndex) => {
      console.log(`  Fila ${rowIndex + 1} (${row.teachingHour.startTime}):`, {
        timeSlot: row.timeSlot.name,
        teachingHour: `${row.teachingHour.startTime}-${row.teachingHour.endTime}`,
        cells: this.workingDays.map(day => ({
          day: this.getDayName(day),
          hasSession: !!row.cells[day]?.session,
          sessionName: row.cells[day]?.session?.course.name || 'Libre'
        }))
      });
    });

    // Verificar que las sesiones están en las celdas correctas
    console.log('🔍 Verificación de celdas con sesiones:');
    this.scheduleGrid.hourRows.forEach((row, rowIndex) => {
      this.workingDays.forEach((day, dayIndex) => {
        const cell = row.cells[day];
        if (cell?.session) {
          console.log(`  ✅ Sesión encontrada en fila ${rowIndex + 1}, columna ${dayIndex + 1} (${this.getDayName(day)}):`, {
            sessionDay: cell.session.dayOfWeek,
            sessionDayName: this.getDayName(cell.session.dayOfWeek),
            courseName: cell.session.course.name,
            shouldMatch: day === cell.session.dayOfWeek ? '✅' : '❌'
          });
        }
      });
    });
  }

  // ✅ MÉTODO CORREGIDO: Construcción del grid con manejo correcto de sesiones multi-hora
  private buildScheduleGrid(timeSlots: TimeSlot[]): void {
    if (!timeSlots || timeSlots.length === 0) {
      this.scheduleGrid = { timeSlots: [], hourRows: [] };
      return;
    }

    console.log('🔧 Building schedule grid...');

    // Ordenar time slots por hora de inicio
    const sortedTimeSlots = [...timeSlots].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    const hourRows: ScheduleHourRow[] = [];

    // Construir filas por cada hora pedagógica
    sortedTimeSlots.forEach(timeSlot => {
      // Ordenar las horas pedagógicas por orden
      const sortedHours = [...timeSlot.teachingHours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);

      sortedHours.forEach((hour, hourIndex) => {
        const row: ScheduleHourRow = {
          teachingHour: hour,
          timeSlot: {
            uuid: timeSlot.uuid,
            name: timeSlot.name,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime
          },
          isFirstHourOfTimeSlot: hourIndex === 0,
          isLastHourOfTimeSlot: hourIndex === sortedHours.length - 1,
          hourIndexInTimeSlot: hourIndex,
          totalHoursInTimeSlot: sortedHours.length,
          cells: {}
        };

        // ✅ CORREGIDO: Crear celdas para cada día en el orden correcto
        this.workingDays.forEach((day, dayIndex) => {
          const sessionInfo = this.getSessionInfoForHour(day, hour);

          row.cells[day] = {
            teachingHour: hour,
            session: sessionInfo.session,
            isAvailable: !sessionInfo.session,
            isSelected: false
          } as ScheduleCell;

          // ✅ NUEVO: Debug del mapeo de celdas
          if (sessionInfo.session) {
            console.log(`🎯 Sesión mapeada:`, {
              hour: hour.startTime,
              dayRequested: day,
              dayIndex: dayIndex,
              dayName: this.getDayName(day),
              sessionDay: sessionInfo.session.dayOfWeek,
              sessionDayName: this.getDayName(sessionInfo.session.dayOfWeek),
              courseName: sessionInfo.session.course.name
            });
          }
        });

        hourRows.push(row);
      });
    });

    this.scheduleGrid = {
      timeSlots: sortedTimeSlots,
      hourRows
    };

    console.log('✅ Schedule grid built:', {
      timeSlots: sortedTimeSlots.length,
      hourRows: hourRows.length,
      workingDays: this.workingDays.map(d => this.getDayName(d))
    });
  }

  // ✅ NUEVO MÉTODO: Obtener información de sesión para una hora específica
  protected getSessionInfoForHour(day: DayOfWeek, hour: TeachingHour): {
    session?: ClassSessionResponse;
    isFirstHour: boolean;
    isLastHour: boolean;
    isPartOfMultiHour: boolean;
    spanHours: number;
    hourIndex: number;
  } {
    // Buscar sesión que contenga esta hora
    const session = this.sessions.find(session =>
      session.dayOfWeek === day &&
      session.teachingHours.some(h => h.uuid === hour.uuid)
    );

    if (!session) {
      return {
        isFirstHour: false,
        isLastHour: false,
        isPartOfMultiHour: false,
        spanHours: 0,
        hourIndex: -1
      };
    }

    const sessionHours = session.teachingHours.sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
    const hourIndex = sessionHours.findIndex(h => h.uuid === hour.uuid);
    const isFirstHour = hourIndex === 0;
    const isLastHour = hourIndex === sessionHours.length - 1;
    const isPartOfMultiHour = session.teachingHours.length > 1;

    return {
      session, // ✅ CAMBIO: Ahora retornamos la sesión en TODAS las horas
      isFirstHour,
      isLastHour,
      isPartOfMultiHour,
      spanHours: session.teachingHours.length,
      hourIndex
    };
  }

  private groupSessionsByDay(): void {
    this.sessionsByDay = {};
    this.sessions.forEach(session => {
      if (!this.sessionsByDay[session.dayOfWeek]) {
        this.sessionsByDay[session.dayOfWeek] = [];
      }
      this.sessionsByDay[session.dayOfWeek]!.push(session);
    });

    // Ordenar sesiones de cada día por hora de inicio
    Object.keys(this.sessionsByDay).forEach(day => {
      this.sessionsByDay[day as DayOfWeek]!.sort((a, b) => {
        const timeA = a.teachingHours[0]?.startTime || '00:00';
        const timeB = b.teachingHours[0]?.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    // ✅ NUEVO: Verificar el mapeo después de agrupar
    this.verifyDayMapping();
  }

  // ===== MÉTODOS PARA EL TABLERO =====

  getCellForDay(row: ScheduleHourRow, day: DayOfWeek): ScheduleCell | undefined {
    return row.cells[day];
  }

  // ✅ MÉTODO MEJORADO: Clases CSS para celdas del tablero
  getScheduleCellClass(row: ScheduleHourRow, day: DayOfWeek): string {
    const cell = this.getCellForDay(row, day);
    const sessionInfo = this.getSessionInfoForHour(day, row.teachingHour);
    let classes = '';

    if (sessionInfo.session) {
      const sessionType = sessionInfo.session.sessionType.name === 'THEORY' ? 'theory-session' : 'practice-session';

      if (sessionInfo.isPartOfMultiHour) {
        classes += `multi-hour-session ${sessionType} `;

        if (sessionInfo.isFirstHour) {
          classes += 'multi-hour-first ';
        } else if (sessionInfo.isLastHour) {
          classes += 'multi-hour-last ';
        } else {
          classes += 'multi-hour-middle ';
        }
      } else {
        classes += `single-hour-session ${sessionType} `;
      }
    } else {
      classes += 'empty-session';
    }

    return classes;
  }

  getSessionCardClasses(session: ClassSessionResponse): string {
    const baseClasses = 'session-card';
    if (session.sessionType.name === 'THEORY') {
      return `${baseClasses} theory-session`;
    } else {
      return `${baseClasses} practice-session`;
    }
  }

  getSessionTooltip(session: ClassSessionResponse): string {
    const timeRange = this.getSessionTimeRange(session);
    return `📚 ${session.course.name}
👨‍🏫 ${this.teacher?.fullName}
👥 Grupo: ${session.studentGroup.name}
🏫 Aula: ${session.learningSpace.name}
⏰ ${timeRange}
📝 Tipo: ${this.getSessionTypeName(session.sessionType.name)}
⏱️ ${session.totalHours} hora(s) pedagógica(s)
${session.notes ? `📝 Notas: ${session.notes}` : ''}`;
  }

  formatTime(time: string): string {
    return time ? time.substring(0, 5) : '--:--';
  }

  trackByHourRow(index: number, row: ScheduleHourRow): string {
    return row.teachingHour.uuid;
  }

  // ===== MÉTODOS DE UI ACTUALIZADOS =====

  // ✅ CORREGIDO: Mapeo explícito de nombres de días
  getDayName(day: DayOfWeek): string {
    const dayNames: Record<string, string> = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes',
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes',
      'SATURDAY': 'Sábado',
      'SUNDAY': 'Domingo'
    };

    const dayName = dayNames[day] || day;

    // ✅ NUEVO: Debug del mapeo de nombres
    console.log(`🔤 Day mapping: ${day} -> ${dayName}`);

    return dayName;
  }

  // ✅ NUEVO MÉTODO: Verificar mapeo correcto
  private verifyDayMapping(): void {
    console.log('🔍 Verificando mapeo de días:');
    this.workingDays.forEach((day, index) => {
      console.log(`  Columna ${index}: ${day} -> ${this.getDayName(day)}`);
    });

    console.log('🔍 Sesiones por día:');
    Object.keys(this.sessionsByDay).forEach(day => {
      const sessions = this.sessionsByDay[day as DayOfWeek] || [];
      console.log(`  ${this.getDayName(day as DayOfWeek)}: ${sessions.length} sesiones`);
      sessions.forEach(session => {
        console.log(`    - ${session.course.name} (${this.getSessionTimeRange(session)})`);
      });
    });
  }

  getDayHeaderClass(day: DayOfWeek): string {
    const hasClasses = this.getDayClasses(day).length > 0;
    return hasClasses ? 'has-classes' : 'no-classes';
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

  getDayClasses(day: DayOfWeek): ClassSessionResponse[] {
    return this.sessionsByDay[day] || [];
  }

  getDayHours(day: DayOfWeek): number {
    return this.getDayClasses(day).reduce((total, session) => total + session.totalHours, 0);
  }

  getTotalHours(): number {
    return this.sessions.reduce((total, session) => total + session.totalHours, 0);
  }

  getTheoryHours(): number {
    return this.sessions
      .filter(session => session.sessionType.name === 'THEORY')
      .reduce((total, session) => total + session.totalHours, 0);
  }

  getPracticeHours(): number {
    return this.sessions
      .filter(session => session.sessionType.name === 'PRACTICE')
      .reduce((total, session) => total + session.totalHours, 0);
  }

  getSessionTimeRange(session: ClassSessionResponse): string {
    if (!session.teachingHours || session.teachingHours.length === 0) {
      return 'Sin horario definido';
    }

    const sortedHours = [...session.teachingHours].sort((a, b) => a.orderInTimeSlot - b.orderInTimeSlot);
    const startTime = sortedHours[0].startTime.substring(0, 5);
    const endTime = sortedHours[sortedHours.length - 1].endTime.substring(0, 5);

    return `${startTime} - ${endTime}`;
  }

  getSessionCardClass(session: ClassSessionResponse): string {
    return session.sessionType.name === 'THEORY' ? 'theory-session' : 'practice-session';
  }

  getSessionTypeChipClass(session: ClassSessionResponse): string {
    return session.sessionType.name === 'THEORY' ? 'theory-chip' : 'practice-chip';
  }

  getSessionTypeName(typeName: string): string {
    return typeName === 'THEORY' ? 'Teoría' : 'Práctica';
  }

  getSessionTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  // ===== MÉTODOS DE AUTORIZACIÓN CORREGIDOS =====

  // ✅ CORREGIDO: Solo administradores pueden gestionar horarios
  canManageSchedules(): boolean {
    const userRole = this.authService.getUserRole();
    const canManage = userRole === 'COORDINATOR' || userRole === 'ASSISTANT';

    console.log('🔍 DEBUG - canManageSchedules():', {
      userRole,
      canManage,
      isAdmin: this.authService.isAdmin()
    });

    return canManage;
  }

  // ✅ CORREGIDO: Verificar si el usuario actual es docente
  isCurrentUserTeacher(): boolean {
    const userRole = this.authService.getUserRole();
    return userRole === 'TEACHER';
  }

  navigateToScheduleManagement(): void {
    if (!this.teacher) return;

    // Solo permitir navegación si es administrador
    if (!this.canManageSchedules()) {
      this.showSnackBar('No tienes permisos para gestionar horarios', 'warning');
      return;
    }

    // Navegar al módulo de gestión de horarios por docente con el UUID del docente
    this.router.navigate(['/dashboard/horarios/by-teacher'], {
      queryParams: { teacherUuid: this.teacher.uuid }
    });

    this.showSnackBar('Redirigiendo a la gestión de horarios...', 'info');
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }
}
