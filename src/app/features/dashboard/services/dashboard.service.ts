// src/app/features/dashboard/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';
import { HttpClient } from '@angular/common/http';

export interface DashboardStats {
  totalGroups: number;
  totalTeachers: number;
  totalCourses: number;
  totalSpaces: number;
  totalSessions: number;
  completionRate: number;
  groupsWithIssues: number;
  unassignedGroups: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService extends BaseApiService {

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Obtiene todas las estadísticas del dashboard en una sola llamada
   */
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      groups: this.get('/protected/student-groups'),
      teachers: this.get('/protected/teachers'),
      courses: this.get('/protected/courses'),
      spaces: this.get('/protected/learning-space'),
      sessions: this.get('/protected/class-sessions')
    }).pipe(
      map(({ groups, teachers, courses, spaces, sessions }) => {
        const groupsData = Array.isArray(groups.data) ? groups.data : [groups.data];
        const teachersData = Array.isArray(teachers.data) ? teachers.data : [teachers.data];
        const coursesData = Array.isArray(courses.data) ? courses.data : [courses.data];
        const spacesData = Array.isArray(spaces.data) ? spaces.data : [spaces.data];
        const sessionsData = Array.isArray(sessions.data) ? sessions.data : [sessions.data];

        return {
          totalGroups: groupsData.length,
          totalTeachers: teachersData.length,
          totalCourses: coursesData.length,
          totalSpaces: spacesData.length,
          totalSessions: sessionsData.length,
          completionRate: this.calculateCompletionRate(groupsData, sessionsData),
          groupsWithIssues: 0, // Se actualizará con las notificaciones
          unassignedGroups: 0 // Se actualizará con las notificaciones
        };
      })
    );
  }

  /**
   * Obtiene grupos de estudiantes
   */
  getStudentGroups(): Observable<any> {
    return this.get('/protected/student-groups');
  }

  /**
   * Obtiene docentes
   */
  getTeachers(): Observable<any> {
    return this.get('/protected/teachers');
  }

  /**
   * Obtiene cursos
   */
  getCourses(): Observable<any> {
    return this.get('/protected/courses');
  }

  /**
   * Obtiene espacios de aprendizaje
   */
  getLearningSpaces(): Observable<any> {
    return this.get('/protected/learning-space');
  }

  /**
   * Obtiene sesiones de clase
   */
  getClassSessions(): Observable<any> {
    return this.get('/protected/class-sessions');
  }

  /**
   * Obtiene estadísticas resumidas
   */
  getSummaryStats(): Observable<{
    teachers: number;
    groups: number;
    sessions: number;
    completionRate: number;
  }> {
    return this.getDashboardStats().pipe(
      map(stats => ({
        teachers: stats.totalTeachers,
        groups: stats.totalGroups,
        sessions: stats.totalSessions,
        completionRate: stats.completionRate
      }))
    );
  }

  /**
   * Calcula la tasa de finalización de asignaciones
   */
  private calculateCompletionRate(groups: any[], sessions: any[]): number {
    if (groups.length === 0) return 0;

    const groupsWithSessions = new Set(
      sessions.map(s => s.studentGroup?.uuid).filter(Boolean)
    );

    return Math.round((groupsWithSessions.size / groups.length) * 100);
  }

  /**
   * Obtiene estadísticas específicas para el rol de docente
   */
  getTeacherStats(teacherUuid: string): Observable<{
    totalAvailabilities: number;
    assignedSessions: number;
    weeklyHours: number;
  }> {
    return forkJoin({
      availabilities: this.get(`/protected/teachers/${teacherUuid}/availabilities`),
      sessions: this.get('/protected/class-sessions')
    }).pipe(
      map(({ availabilities, sessions }) => {
        const availabilitiesData = Array.isArray(availabilities.data)
          ? availabilities.data
          : [availabilities.data];

        const sessionsData = Array.isArray(sessions.data)
          ? sessions.data
          : [sessions.data];

        const teacherSessions = sessionsData.filter(
          (s: any) => s.teacher?.uuid === teacherUuid
        );

        const weeklyHours = teacherSessions.reduce(
          (total: number, session: any) => total + (session.totalHours || 0),
          0
        );

        return {
          totalAvailabilities: availabilitiesData.length,
          assignedSessions: teacherSessions.length,
          weeklyHours
        };
      })
    );
  }

  /**
   * Obtiene información de uso del sistema
   */
  getSystemUsage(): Observable<{
    activeUsers: number;
    recentActivity: number;
    systemHealth: 'good' | 'warning' | 'critical';
  }> {
    // Esta información podría venir de un endpoint específico en el futuro
    return this.getDashboardStats().pipe(
      map(stats => ({
        activeUsers: stats.totalTeachers,
        recentActivity: stats.totalSessions,
        systemHealth: this.determineSystemHealth(stats)
      }))
    );
  }

  /**
   * Determina la salud del sistema basado en las estadísticas
   */
  private determineSystemHealth(stats: DashboardStats): 'good' | 'warning' | 'critical' {
    if (stats.completionRate < 50) return 'critical';
    if (stats.completionRate < 80) return 'warning';
    return 'good';
  }

  /**
   * Obtiene tendencias de uso (simulado por ahora)
   */
  getTrends(): Observable<{
    teachersGrowth: number;
    groupsGrowth: number;
    sessionsGrowth: number;
    period: string;
  }> {
    // En una implementación real, esto vendría del backend
    // Por ahora simulamos datos
    return this.getDashboardStats().pipe(
      map(stats => ({
        teachersGrowth: Math.random() * 20 - 10, // Entre -10% y +10%
        groupsGrowth: Math.random() * 15 - 5,    // Entre -5% y +10%
        sessionsGrowth: Math.random() * 25 - 5,  // Entre -5% y +20%
        period: 'último mes'
      }))
    );
  }

  /**
   * Obtiene alertas del sistema
   */
  getSystemAlerts(): Observable<{
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }[]> {
    return this.getDashboardStats().pipe(
      map(stats => {
        const alerts: {
          type: 'info' | 'warning' | 'error';
          message: string;
          timestamp: Date;
        }[] = [];

        if (stats.completionRate < 50) {
          alerts.push({
            type: 'error',
            message: 'Baja tasa de asignación de horarios',
            timestamp: new Date()
          });
        }

        if (stats.totalSessions === 0) {
          alerts.push({
            type: 'warning',
            message: 'No hay sesiones programadas',
            timestamp: new Date()
          });
        }

        if (stats.totalTeachers > 0 && stats.totalGroups > 0 && stats.totalSessions > 0) {
          alerts.push({
            type: 'info',
            message: 'Sistema funcionando correctamente',
            timestamp: new Date()
          });
        }

        return alerts;
      })
    );
  }
}
