// src/app/shared/components/notifications-panel/notifications-panel.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

// Services
import { NotificationService, GroupNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="relative">
      <!-- Botón de notificaciones -->
      <button
        mat-icon-button
        [matMenuTriggerFor]="notificationsMenu"
        (click)="onNotificationsClick()"
        class="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg"
        [matTooltip]="getTooltipText()"
        [matBadge]="unreadCount"
        [matBadgeHidden]="unreadCount === 0"
        matBadgeColor="warn"
        matBadgeSize="small">
        <mat-icon class="text-lg">notifications</mat-icon>
      </button>

      <!-- Menú de notificaciones -->
      <mat-menu #notificationsMenu="matMenu" class="notifications-menu" [hasBackdrop]="true">
        <div class="w-96 max-w-[90vw] max-h-[70vh] overflow-hidden" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="p-4 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <mat-icon class="text-blue-600 text-lg">notifications</mat-icon>
                </div>
                <div>
                  <h3 class="font-semibold text-slate-800">Notificaciones</h3>
                  <p class="text-xs text-slate-500" *ngIf="!loading">
                    {{ notifications.length }} notificación(es)
                    <span *ngIf="unreadCount > 0" class="text-red-600">
                      • {{ unreadCount }} sin leer
                    </span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <button
                  mat-icon-button
                  size="small"
                  (click)="refreshNotifications()"
                  [disabled]="loading"
                  class="text-slate-500 hover:text-slate-700"
                  matTooltip="Actualizar">
                  <mat-icon [class.animate-spin]="loading" class="text-lg">refresh</mat-icon>
                </button>

                <button
                  mat-icon-button
                  size="small"
                  (click)="markAllAsRead()"
                  [disabled]="unreadCount === 0"
                  class="text-slate-500 hover:text-slate-700"
                  matTooltip="Marcar todo como leído">
                  <mat-icon class="text-lg">done_all</mat-icon>
                </button>
              </div>
            </div>

            <!-- Resumen rápido -->
            <div class="flex items-center gap-2 mt-3" *ngIf="!loading && notifications.length > 0">
              <div class="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-full text-xs"
                   *ngIf="summary.high > 0">
                <mat-icon class="text-red-600" style="font-size: 14px; width: 14px; height: 14px;">priority_high</mat-icon>
                <span class="text-red-700 font-medium">{{ summary.high }}</span>
              </div>
              <div class="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full text-xs"
                   *ngIf="summary.medium > 0">
                <mat-icon class="text-yellow-600" style="font-size: 14px; width: 14px; height: 14px;">warning</mat-icon>
                <span class="text-yellow-700 font-medium">{{ summary.medium }}</span>
              </div>
              <div class="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-xs"
                   *ngIf="summary.low > 0">
                <mat-icon class="text-blue-600" style="font-size: 14px; width: 14px; height: 14px;">info</mat-icon>
                <span class="text-blue-700 font-medium">{{ summary.low }}</span>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="flex items-center justify-center p-8">
            <div class="text-center">
              <mat-spinner diameter="40"></mat-spinner>
              <p class="text-sm text-slate-500 mt-3">Cargando notificaciones...</p>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && notifications.length === 0"
               class="flex flex-col items-center justify-center p-8 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <mat-icon class="text-green-600 text-2xl">check_circle</mat-icon>
            </div>
            <h4 class="font-medium text-slate-800 mb-2">¡Todo al día!</h4>
            <p class="text-sm text-slate-500">No hay notificaciones pendientes</p>
          </div>

          <!-- Lista de notificaciones -->
          <div *ngIf="!loading && notifications.length > 0"
               class="max-h-96 overflow-y-auto">

            <div
              *ngFor="let notification of notifications; trackBy: trackByNotification"
              class="notification-item p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
              [class.unread]="!isRead(notification.id)"
              (click)="onNotificationClick(notification)">

              <div class="flex items-start gap-3">
                <!-- Icono de notificación -->
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                     [ngClass]="getSeverityClasses(notification.severity)">
                  <mat-icon class="text-lg">{{ getNotificationIcon(notification.type) }}</mat-icon>
                </div>

                <!-- Contenido -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="font-medium text-slate-800 text-sm leading-tight">
                      {{ notification.title }}
                    </h4>
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <!-- Indicador de no leído -->
                      <div *ngIf="!isRead(notification.id)"
                           class="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <!-- Badge de severidad -->
                      <div class="px-2 py-1 rounded-full text-xs font-medium"
                           [ngClass]="getSeverityBadgeClasses(notification.severity)">
                        {{ getSeverityLabel(notification.severity) }}
                      </div>
                    </div>
                  </div>

                  <p class="text-sm text-slate-600 mt-1 leading-relaxed">
                    {{ notification.message }}
                  </p>

                  <!-- Información adicional -->
                  <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <div class="flex items-center gap-1">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">group</mat-icon>
                      <span>{{ notification.groupName }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">school</mat-icon>
                      <span>Ciclo {{ notification.cycleNumber }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">schedule</mat-icon>
                      <span>{{ getTimeAgo(notification.timestamp) }}</span>
                    </div>
                  </div>

                  <!-- Datos específicos -->
                  <div class="mt-2" *ngIf="notification.data">
                    <div *ngIf="notification.data.missingCourses"
                         class="text-xs text-red-600 font-medium">
                      {{ notification.data.missingCourses }} curso(s) sin asignar
                    </div>
                    <div *ngIf="notification.data.totalMissingHours"
                         class="text-xs text-yellow-600 font-medium">
                      {{ notification.data.totalMissingHours }} hora(s) faltante(s)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div *ngIf="!loading && notifications.length > 0"
               class="p-3 border-t border-slate-200 bg-slate-50">
            <button
              mat-button
              color="primary"
              size="small"
              class="w-full"
              [routerLink]="['/dashboard/horarios']">
              <mat-icon class="mr-2">schedule</mat-icon>
              Ver Gestión de Horarios
            </button>
          </div>
        </div>
      </mat-menu>
    </div>
  `,
  styles: [`
    /* Estilos personalizados para las notificaciones */
    .notification-item {
      position: relative;
      transition: all 0.2s ease;
    }

    .notification-item.unread {
      background-color: rgba(59, 130, 246, 0.05);
      border-left: 3px solid #3b82f6;
    }

    .notification-item:hover {
      background-color: rgba(248, 250, 252, 1);
    }

    .notification-item.unread:hover {
      background-color: rgba(59, 130, 246, 0.08);
    }

    /* Personalizar el menú */
    ::ng-deep .notifications-menu {
      .mat-mdc-menu-panel {
        max-width: none !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
      }
    }

    /* Animaciones para el spinner */
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Scrollbar personalizado */
    ::-webkit-scrollbar {
      width: 4px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f5f9;
    }

    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private notificationService = inject(NotificationService);

  // Estado del componente
  loading = false;
  notifications: GroupNotification[] = [];
  unreadCount = 0;
  summary = { total: 0, high: 0, medium: 0, low: 0, unread: 0 };

  ngOnInit(): void {
    this.initializeNotifications();
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeNotifications(): void {
    this.loading = true;
    this.notificationService.loadNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.loading = false;
        }
      });
  }

  private subscribeToNotifications(): void {
    // Suscribirse a las notificaciones
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.updateSummary();
      });

    // Suscribirse al contador de no leídas
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  private updateSummary(): void {
    this.summary = this.notificationService.getNotificationsSummary();
  }

  // === MÉTODOS DE INTERACCIÓN ===

  onNotificationsClick(): void {
    // Se ejecuta cuando se abre el menú
    // Podríamos marcar como "visto" pero no como "leído"
  }

  onNotificationClick(notification: GroupNotification): void {
    // Marcar como leída
    this.notificationService.markAsRead(notification.id);

    // Navegar si tiene URL de acción
    if (notification.actionUrl) {
      // La navegación se maneja a través del routerLink en el template
      // o podríamos usar el Router aquí si necesitáramos lógica adicional
    }
  }

  refreshNotifications(): void {
    this.loading = true;
    this.notificationService.refreshNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: (error) => {
          console.error('Error refreshing notifications:', error);
          this.loading = false;
        }
      });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  // === MÉTODOS DE UTILIDAD ===

  isRead(notificationId: string): boolean {
    return this.notificationService.isRead(notificationId);
  }

  getNotificationIcon(type: GroupNotification['type']): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getSeverityClasses(severity: GroupNotification['severity']): string {
    const classes = {
      high: 'bg-red-100 text-red-600',
      medium: 'bg-yellow-100 text-yellow-600',
      low: 'bg-blue-100 text-blue-600'
    };
    return classes[severity] || 'bg-gray-100 text-gray-600';
  }

  getSeverityBadgeClasses(severity: GroupNotification['severity']): string {
    const classes = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    return classes[severity] || 'bg-gray-100 text-gray-700';
  }

  getSeverityLabel(severity: GroupNotification['severity']): string {
    const labels = {
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo'
    };
    return labels[severity] || 'Info';
  }

  getTooltipText(): string {
    if (this.loading) return 'Cargando notificaciones...';
    if (this.unreadCount === 0) return 'No hay notificaciones nuevas';
    return `${this.unreadCount} notificación(es) sin leer`;
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Ahora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return timestamp.toLocaleDateString();
  }

  trackByNotification(index: number, notification: GroupNotification): string {
    return notification.id;
  }
}
