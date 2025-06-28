// src/app/shared/services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

export interface CourseAssignmentSummary {
  courseUuid: string;
  courseName: string;
  requiredTheoryHours: number;
  requiredPracticeHours: number;
  assignedTheoryHours: number;
  assignedPracticeHours: number;
  missingTheoryHours: number;
  missingPracticeHours: number;
  totalMissingHours: number;
  isComplete: boolean;
  hasSessions: boolean;
}

export interface GroupNotification {
  id: string;
  type: 'MISSING_COURSES' | 'INCOMPLETE_HOURS' | 'UNASSIGNED_GROUP';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  groupUuid: string;
  groupName: string;
  cycleNumber: number;
  careerName: string;
  data: {
    missingCourses?: number;
    totalMissingHours?: number;
    courses?: CourseAssignmentSummary[];
  };
  timestamp: Date;
  actionUrl?: string;
}

// Interfaces para tipado
interface Group {
  uuid: string;
  name: string;
  cycleUuid?: string;
  careerUuid?: string;
  cycleNumber: number;
  careerName?: string;
}

interface Course {
  uuid: string;
  name: string;
  weeklyTheoryHours: number;
  weeklyPracticeHours: number;
  cycle: {
    number: number;
  };
  career: {
    uuid: string;
  };
}

interface Session {
  uuid: string;
  totalHours?: number;
  teachingHours?: any[];
  sessionType: {
    name: string;
  };
  studentGroup: {
    uuid: string;
  };
  course: {
    uuid: string;
  };
}

interface GroupAnalysis {
  expectedCourses: Course[];
  coursesSummary: CourseAssignmentSummary[];
  totalExpectedCourses: number;
  totalAssignedCourses: number;
  totalMissingHours: number;
  hasAnyAssignment: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseApiService {
  private notificationsSubject = new BehaviorSubject<GroupNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private readNotifications = new Set<string>();

  /**
   * Carga todas las notificaciones del sistema
   */
  loadNotifications(): Observable<GroupNotification[]> {
    return this.loadGroupAssignmentNotifications().pipe(
      map((notifications: GroupNotification[]) => {
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
        return notifications;
      }),
      catchError((error: any) => {
        console.error('Error loading notifications:', error);
        return of([]);
      })
    );
  }

  /**
   * Carga notificaciones relacionadas con asignaciones de grupos
   */
  private loadGroupAssignmentNotifications(): Observable<GroupNotification[]> {
    return combineLatest([
      this.getAllGroups(),
      this.getAllCourses(),
      this.getAllSessions()
    ]).pipe(
      map(([groupsResponse, coursesResponse, sessionsResponse]) => {
        const groups: Group[] = Array.isArray(groupsResponse.data) ? groupsResponse.data : [groupsResponse.data];
        const courses: Course[] = Array.isArray(coursesResponse.data) ? coursesResponse.data : [coursesResponse.data];
        const sessions: Session[] = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [sessionsResponse.data];

        const notifications: GroupNotification[] = [];

        groups.forEach((group: Group) => {
          if (!group.cycleUuid || !group.careerUuid) return;

          // Obtener cursos que debería tener este grupo
          const expectedCourses = courses.filter((course: Course) =>
            course.cycle.number === group.cycleNumber &&
            course.career.uuid === group.careerUuid
          );

          // Obtener sesiones asignadas a este grupo
          const groupSessions = sessions.filter((session: Session) =>
            session.studentGroup.uuid === group.uuid
          );

          // Analizar asignaciones
          const analysis = this.analyzeGroupAssignments(group, expectedCourses, groupSessions);

          // Generar notificaciones según el análisis
          notifications.push(...this.generateNotificationsForGroup(group, analysis));
        });

        return notifications.sort((a, b) => {
          // Ordenar por severidad y fecha
          const severityOrder = { high: 3, medium: 2, low: 1 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[b.severity] - severityOrder[a.severity];
          }
          return b.timestamp.getTime() - a.timestamp.getTime();
        });
      })
    );
  }

  /**
   * Analiza las asignaciones de un grupo específico
   */
  private analyzeGroupAssignments(group: Group, expectedCourses: Course[], groupSessions: Session[]): GroupAnalysis {
    const coursesSummary: CourseAssignmentSummary[] = [];
    let totalMissingHours = 0;

    expectedCourses.forEach((course: Course) => {
      // Encontrar sesiones para este curso
      const courseSessions = groupSessions.filter((session: Session) =>
        session.course.uuid === course.uuid
      );

      // Calcular horas asignadas por tipo
      let assignedTheoryHours = 0;
      let assignedPracticeHours = 0;

      courseSessions.forEach((session: Session) => {
        const sessionHours = session.totalHours || session.teachingHours?.length || 0;
        if (session.sessionType.name === 'THEORY') {
          assignedTheoryHours += sessionHours;
        } else if (session.sessionType.name === 'PRACTICE') {
          assignedPracticeHours += sessionHours;
        }
      });

      const missingTheoryHours = Math.max(0, course.weeklyTheoryHours - assignedTheoryHours);
      const missingPracticeHours = Math.max(0, course.weeklyPracticeHours - assignedPracticeHours);
      const totalMissing = missingTheoryHours + missingPracticeHours;

      const summary: CourseAssignmentSummary = {
        courseUuid: course.uuid,
        courseName: course.name,
        requiredTheoryHours: course.weeklyTheoryHours,
        requiredPracticeHours: course.weeklyPracticeHours,
        assignedTheoryHours,
        assignedPracticeHours,
        missingTheoryHours,
        missingPracticeHours,
        totalMissingHours: totalMissing,
        isComplete: totalMissing === 0,
        hasSessions: courseSessions.length > 0
      };

      coursesSummary.push(summary);
      totalMissingHours += totalMissing;
    });

    return {
      expectedCourses,
      coursesSummary,
      totalExpectedCourses: expectedCourses.length,
      totalAssignedCourses: coursesSummary.filter((c: CourseAssignmentSummary) => c.hasSessions).length,
      totalMissingHours,
      hasAnyAssignment: groupSessions.length > 0
    };
  }

  /**
   * Genera notificaciones para un grupo basado en su análisis
   */
  private generateNotificationsForGroup(group: Group, analysis: GroupAnalysis): GroupNotification[] {
    const notifications: GroupNotification[] = [];
    const now = new Date();

    // 1. Grupo sin ninguna asignación
    if (!analysis.hasAnyAssignment) {
      notifications.push({
        id: `unassigned-${group.uuid}`,
        type: 'UNASSIGNED_GROUP',
        severity: 'high',
        title: 'Grupo sin horarios asignados',
        message: `El grupo ${group.name} no tiene ninguna clase asignada`,
        groupUuid: group.uuid,
        groupName: group.name,
        cycleNumber: group.cycleNumber,
        careerName: group.careerName || 'N/A',
        data: {
          missingCourses: analysis.totalExpectedCourses,
          totalMissingHours: analysis.coursesSummary.reduce((sum: number, c: CourseAssignmentSummary) =>
            sum + c.requiredTheoryHours + c.requiredPracticeHours, 0)
        },
        timestamp: now,
        actionUrl: `/dashboard/horarios/by-group?groupUuid=${group.uuid}`
      });
      return notifications;
    }

    // 2. Cursos completamente faltantes
    const missingCourses = analysis.coursesSummary.filter((c: CourseAssignmentSummary) => !c.hasSessions);
    if (missingCourses.length > 0) {
      notifications.push({
        id: `missing-courses-${group.uuid}`,
        type: 'MISSING_COURSES',
        severity: missingCourses.length >= 3 ? 'high' : 'medium',
        title: 'Cursos sin asignar',
        message: `${missingCourses.length} curso(s) sin asignar al grupo ${group.name}`,
        groupUuid: group.uuid,
        groupName: group.name,
        cycleNumber: group.cycleNumber,
        careerName: group.careerName || 'N/A',
        data: {
          missingCourses: missingCourses.length,
          courses: missingCourses
        },
        timestamp: now,
        actionUrl: `/dashboard/horarios/by-group?groupUuid=${group.uuid}`
      });
    }

    // 3. Cursos con horas incompletas
    const incompleteHoursCourses = analysis.coursesSummary.filter((c: CourseAssignmentSummary) =>
      c.hasSessions && c.totalMissingHours > 0
    );

    if (incompleteHoursCourses.length > 0) {
      const totalMissingHours = incompleteHoursCourses.reduce((sum: number, c: CourseAssignmentSummary) => sum + c.totalMissingHours, 0);

      notifications.push({
        id: `incomplete-hours-${group.uuid}`,
        type: 'INCOMPLETE_HOURS',
        severity: totalMissingHours >= 6 ? 'high' : totalMissingHours >= 3 ? 'medium' : 'low',
        title: 'Horas incompletas',
        message: `${totalMissingHours} hora(s) faltante(s) en ${incompleteHoursCourses.length} curso(s) del grupo ${group.name}`,
        groupUuid: group.uuid,
        groupName: group.name,
        cycleNumber: group.cycleNumber,
        careerName: group.careerName || 'N/A',
        data: {
          totalMissingHours,
          courses: incompleteHoursCourses
        },
        timestamp: now,
        actionUrl: `/dashboard/horarios/by-group?groupUuid=${group.uuid}`
      });
    }

    return notifications;
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId: string): void {
    this.readNotifications.add(notificationId);
    this.updateUnreadCount();
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    const notifications = this.notificationsSubject.getValue();
    notifications.forEach((n: GroupNotification) => this.readNotifications.add(n.id));
    this.updateUnreadCount();
  }

  /**
   * Verifica si una notificación ha sido leída
   */
  isRead(notificationId: string): boolean {
    return this.readNotifications.has(notificationId);
  }

  /**
   * Actualiza el contador de notificaciones no leídas
   */
  private updateUnreadCount(): void {
    const notifications = this.notificationsSubject.getValue();
    const unreadCount = notifications.filter((n: GroupNotification) => !this.isRead(n.id)).length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Obtiene el icono según el tipo de notificación
   */
  getNotificationIcon(type: GroupNotification['type']): string {
    const icons = {
      MISSING_COURSES: 'warning',
      INCOMPLETE_HOURS: 'schedule_send',
      UNASSIGNED_GROUP: 'error_outline'
    };
    return icons[type] || 'info';
  }

  /**
   * Obtiene la clase CSS según la severidad
   */
  getSeverityClass(severity: GroupNotification['severity']): string {
    const classes = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-blue-600 bg-blue-50'
    };
    return classes[severity] || 'text-gray-600 bg-gray-50';
  }

  // === MÉTODOS PARA OBTENER DATOS ===

  private getAllGroups(): Observable<any> {
    return this.get('/protected/student-groups');
  }

  private getAllCourses(): Observable<any> {
    return this.get('/protected/courses');
  }

  private getAllSessions(): Observable<any> {
    return this.get('/protected/class-sessions');
  }

  /**
   * Refresca las notificaciones
   */
  refreshNotifications(): Observable<GroupNotification[]> {
    return this.loadNotifications();
  }

  /**
   * Obtiene notificaciones por severidad
   */
  getNotificationsBySeverity(severity: GroupNotification['severity']): GroupNotification[] {
    return this.notificationsSubject.getValue().filter((n: GroupNotification) => n.severity === severity);
  }

  /**
   * Obtiene el resumen de notificaciones
   */
  getNotificationsSummary(): { total: number; high: number; medium: number; low: number; unread: number } {
    const notifications = this.notificationsSubject.getValue();
    return {
      total: notifications.length,
      high: notifications.filter((n: GroupNotification) => n.severity === 'high').length,
      medium: notifications.filter((n: GroupNotification) => n.severity === 'medium').length,
      low: notifications.filter((n: GroupNotification) => n.severity === 'low').length,
      unread: this.unreadCountSubject.getValue()
    };
  }
}
