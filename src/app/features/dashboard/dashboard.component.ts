// src/app/features/dashboard/dashboard-home.component.ts - VERSIÓN CORREGIDA
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay, Subject, takeUntil } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { UserInfoService } from '../../shared/services/user-info.service';
import { NotificationService, GroupNotification } from '../../shared/services/notification.service';
import { DashboardService, DashboardStats } from './services/dashboard.service';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  stats?: string;
  disabled?: boolean;
  gradient: string;
  iconBg: string;
  progress?: number;
  trending?: 'up' | 'down' | 'stable';
  roles: string[];
}

interface QuickAction {
  title: string;
  icon: string;
  color: string;
  action: () => void;
  description: string;
  roles: string[];
}

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  gradient: string;
  description: string;
  loading?: boolean;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatGridListModule,
    MatIconModule,
    MatRippleModule,
    MatDividerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <!-- Hero Section -->
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div class="relative px-6 py-12 lg:px-8">
          <div class="mx-auto max-w-7xl">
            <div class="flex flex-col lg:flex-row items-center justify-between gap-8">
              <!-- Welcome Content -->
              <div class="flex-1 text-center lg:text-left">
                <h1 class="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                  ¡Bienvenido{{ getUserDisplayName() ? ', ' + getFirstName() : '' }}!
                </h1>
                <p class="text-lg lg:text-xl text-slate-600 mb-6 max-w-2xl">
                  {{ getWelcomeMessage() }}
                </p>
                <div class="flex items-center justify-center lg:justify-start gap-3 text-blue-600">
                  <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <mat-icon class="text-blue-600">access_time</mat-icon>
                  </div>
                  <div class="text-left">
                    <p class="font-semibold">{{ currentTime | date:'EEEE, d MMMM y':'es' }}</p>
                    <p class="text-sm text-slate-500">{{ currentTime | date:'HH:mm':'es' }}</p>
                  </div>
                </div>
              </div>

              <!-- Hero Illustration -->
              <div class="flex-shrink-0">
                <div class="relative w-64 h-64 lg:w-80 lg:h-80">
                  <div class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
                  <div class="absolute inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                    <mat-icon class="text-white text-6xl lg:text-8xl">{{ getHeroIcon() }}</mat-icon>
                  </div>
                  <!-- Floating elements -->
                  <div class="absolute top-4 right-4 w-16 h-16 bg-yellow-400 rounded-full opacity-80 animate-bounce"></div>
                  <div class="absolute bottom-8 left-4 w-12 h-12 bg-green-400 rounded-full opacity-60 animate-pulse"></div>
                  <div class="absolute top-1/2 right-0 w-8 h-8 bg-pink-400 rounded-full opacity-70"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Section -->
      <div class="px-6 -mt-8 relative z-10">
        <div class="mx-auto max-w-7xl">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <mat-icon class="text-white">flash_on</mat-icon>
              </div>
              <h2 class="text-2xl font-bold text-slate-800">Acciones Rápidas</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                *ngFor="let action of getFilteredQuickActions()"
                (click)="onQuickAction(action)"
                class="group flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-blue-50 hover:to-purple-50 rounded-xl border border-slate-200/50 hover:border-blue-300/50 transition-all duration-300 hover:scale-105 hover:shadow-lg text-left">

                <div class="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300"
                     [ngClass]="action.color">
                  <mat-icon class="text-white group-hover:scale-110 transition-transform duration-300">
                    {{ action.icon }}
                  </mat-icon>
                </div>

                <div class="flex-1">
                  <h3 class="font-semibold text-slate-800 group-hover:text-blue-800 transition-colors duration-300">
                    {{ action.title }}
                  </h3>
                  <p class="text-sm text-slate-600 mt-1">{{ action.description }}</p>
                </div>

                <mat-icon class="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300">
                  arrow_forward
                </mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="px-6 py-12">
        <div class="mx-auto max-w-7xl">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <mat-icon class="text-white">analytics</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Estadísticas en Tiempo Real</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div
              *ngFor="let stat of statsCards"
              class="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">

              <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                     [ngClass]="stat.gradient">
                  <mat-icon class="text-white text-xl" *ngIf="!stat.loading">{{ stat.icon }}</mat-icon>
                  <mat-spinner diameter="20" *ngIf="stat.loading"></mat-spinner>
                </div>
                <div class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                     [ngClass]="{
                       'bg-green-100 text-green-700': stat.changeType === 'positive',
                       'bg-red-100 text-red-700': stat.changeType === 'negative',
                       'bg-gray-100 text-gray-700': stat.changeType === 'neutral'
                     }">
                  <mat-icon class="text-xs">
                    {{ stat.changeType === 'positive' ? 'trending_up' :
                    stat.changeType === 'negative' ? 'trending_down' : 'trending_flat' }}
                  </mat-icon>
                  {{ stat.change }}
                </div>
              </div>

              <h3 class="text-3xl font-bold text-slate-800 mb-2">
                {{ stat.loading ? '...' : stat.value }}
              </h3>
              <p class="text-slate-600 font-medium mb-1">{{ stat.title }}</p>
              <p class="text-sm text-slate-500">{{ stat.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Features Grid - Solo para administradores -->
      <div class="px-6 pb-12" *ngIf="!isTeacher">
        <div class="mx-auto max-w-7xl">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <mat-icon class="text-white">apps</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Módulos del Sistema</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              *ngFor="let card of getFilteredDashboardCards()"
              (click)="onCardClick(card)"
              class="group bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 cursor-pointer"
              [class.opacity-60]="card.disabled"
              [class.cursor-not-allowed]="card.disabled">

              <!-- Card Header with Gradient -->
              <div class="h-32 relative overflow-hidden" [ngClass]="card.gradient">
                <div class="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
                <div class="absolute top-4 left-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center" [ngClass]="card.iconBg">
                    <mat-icon class="text-white text-xl">{{ card.icon }}</mat-icon>
                  </div>
                </div>
                <div class="absolute top-4 right-4">
                  <div *ngIf="card.trending" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <mat-icon class="text-white text-sm">
                      {{ card.trending === 'up' ? 'trending_up' :
                      card.trending === 'down' ? 'trending_down' : 'trending_flat' }}
                    </mat-icon>
                  </div>
                </div>
                <div class="absolute bottom-4 left-4 right-4">
                  <h3 class="text-lg font-bold text-white mb-1">{{ card.title }}</h3>
                  <p class="text-white/80 text-sm">{{ card.stats }}</p>
                </div>
              </div>

              <!-- Card Content -->
              <div class="p-6">
                <p class="text-slate-600 text-sm mb-4 line-clamp-2">{{ card.description }}</p>

                <!-- Progress Bar (if applicable) -->
                <div *ngIf="card.progress !== undefined" class="mb-4">
                  <div class="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso</span>
                    <span>{{ card.progress }}%</span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all duration-1000 ease-out"
                      [ngClass]="card.gradient"
                      [style.width.%]="card.progress">
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <button
                  class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group-hover:bg-blue-50 group-hover:text-blue-700"
                  [disabled]="card.disabled">
                  <span class="font-medium">Acceder</span>
                  <mat-icon class="text-lg group-hover:translate-x-1 transition-transform duration-300">
                    arrow_forward
                  </mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications Summary Section -->
      <div class="px-6 pb-12" *ngIf="!isTeacher && notifications.length > 0">
        <div class="mx-auto max-w-7xl">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <mat-icon class="text-white">notification_important</mat-icon>
                </div>
                <h2 class="text-2xl font-bold text-slate-800">Notificaciones Importantes</h2>
              </div>
              <button
                class="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                [routerLink]="['/dashboard/horarios']">
                Ver gestión de horarios
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let notification of getHighPriorityNotifications(); let i = index"
                   class="notification-card p-4 border rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer"
                   [ngClass]="getNotificationCardClass(notification.severity)"
                   (click)="navigateToNotification(notification)">

                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       [ngClass]="getNotificationIconClass(notification.severity)">
                    <mat-icon class="text-sm">{{ getNotificationIcon(notification.type) }}</mat-icon>
                  </div>

                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-slate-800 text-sm leading-tight mb-1">
                      {{ notification.title }}
                    </h4>
                    <p class="text-xs text-slate-600 mb-2">{{ notification.message }}</p>

                    <div class="flex items-center gap-2 text-xs text-slate-500">
                      <mat-icon style="font-size: 10px; width: 10px; height: 10px;">group</mat-icon>
                      <span>{{ notification.groupName }}</span>
                    </div>
                  </div>

                  <div class="flex-shrink-0">
                    <div class="px-2 py-1 rounded-full text-xs font-medium"
                         [ngClass]="getSeverityBadgeClass(notification.severity)">
                      {{ getSeverityLabel(notification.severity) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mostrar resumen si hay más notificaciones -->
            <div *ngIf="notifications.length > 6"
                 class="mt-4 p-3 bg-slate-50 rounded-lg text-center">
              <p class="text-sm text-slate-600">
                Y {{ notifications.length - 6 }} notificación(es) más...
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Teacher-specific content -->
      <div class="px-6 pb-12" *ngIf="isTeacher">
        <div class="mx-auto max-w-7xl">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <mat-icon class="text-white text-2xl">school</mat-icon>
            </div>
            <h3 class="text-2xl font-bold text-slate-800 mb-3">Panel del Docente</h3>
            <p class="text-slate-600 mb-6 max-w-2xl mx-auto">
              Desde aquí puedes gestionar tu disponibilidad horaria. Es importante mantener actualizada tu disponibilidad
              para que el sistema pueda asignarte las clases de manera óptima.
            </p>
            <button
              mat-raised-button
              color="primary"
              class="px-8 py-3"
              [routerLink]="['/dashboard/docentes/mi-disponibilidad']">
              <mat-icon class="mr-2">schedule</mat-icon>
              Gestionar Mi Disponibilidad
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-card {
      transition: all 0.2s ease;
    }

    .notification-card:hover {
      transform: translateY(-2px);
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Gradientes para las tarjetas */
    .card-gradient-green {
      @apply bg-gradient-to-br from-green-500 to-green-700;
    }

    .card-gradient-orange {
      @apply bg-gradient-to-br from-orange-500 to-orange-700;
    }

    .card-gradient-pink {
      @apply bg-gradient-to-br from-pink-500 to-pink-700;
    }

    .card-gradient-teal {
      @apply bg-gradient-to-br from-teal-500 to-teal-700;
    }

    .card-gradient-indigo {
      @apply bg-gradient-to-br from-indigo-500 to-indigo-700;
    }

    .card-gradient-amber {
      @apply bg-gradient-to-br from-amber-500 to-amber-700;
    }

    /* Estilos para acciones rápidas */
    .bg-gradient-primary {
      @apply bg-gradient-to-br from-blue-500 to-blue-600;
    }

    .bg-gradient-success {
      @apply bg-gradient-to-br from-green-500 to-green-600;
    }

    .bg-gradient-warning {
      @apply bg-gradient-to-br from-orange-500 to-orange-600;
    }
  `]
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  private userInfoService = inject(UserInfoService);
  private notificationService = inject(NotificationService);
  private dashboardService = inject(DashboardService); // ✅ Usar el nuevo servicio

  currentTime = new Date();
  isTeacher = false;
  dashboardStats: DashboardStats | null = null;
  notifications: GroupNotification[] = [];
  loading = true;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Configuración de las tarjetas principales del dashboard
  dashboardCards: DashboardCard[] = [
    {
      title: 'Modalidades',
      description: 'Gestionar modalidades educativas del instituto',
      icon: 'school',
      route: '/dashboard/modalidades',
      color: 'primary',
      stats: 'Cargando...',
      gradient: 'card-gradient-blue',
      iconBg: 'bg-blue-600',
      progress: 0,
      trending: 'stable',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Carreras',
      description: 'Administrar carreras profesionales',
      icon: 'account_balance',
      route: '/dashboard/carreras',
      color: 'secondary',
      stats: 'Cargando...',
      gradient: 'card-gradient-purple',
      iconBg: 'bg-purple-600',
      progress: 0,
      trending: 'up',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Docentes',
      description: 'Gestión de profesores y disponibilidad',
      icon: 'person',
      route: '/dashboard/docentes',
      color: 'success',
      stats: 'Cargando...',
      gradient: 'card-gradient-green',
      iconBg: 'bg-green-600',
      progress: 0,
      trending: 'up',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Grupos',
      description: 'Administrar secciones y grupos',
      icon: 'groups',
      route: '/dashboard/grupos',
      color: 'warning',
      stats: 'Cargando...',
      gradient: 'card-gradient-orange',
      iconBg: 'bg-orange-600',
      progress: 0,
      trending: 'stable',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Cursos',
      description: 'Gestión de materias y asignaturas',
      icon: 'book',
      route: '/dashboard/cursos',
      color: 'accent',
      stats: 'Cargando...',
      gradient: 'card-gradient-pink',
      iconBg: 'bg-pink-600',
      progress: 0,
      trending: 'up',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Ambientes',
      description: 'Administrar aulas y laboratorios',
      icon: 'room',
      route: '/dashboard/ambientes',
      color: 'primary',
      stats: 'Cargando...',
      gradient: 'card-gradient-teal',
      iconBg: 'bg-teal-600',
      progress: 0,
      trending: 'stable',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Turnos',
      description: 'Configurar turnos y horas pedagógicas',
      icon: 'schedule',
      route: '/dashboard/turnos',
      color: 'secondary',
      stats: 'Cargando...',
      gradient: 'card-gradient-indigo',
      iconBg: 'bg-indigo-600',
      progress: 0,
      trending: 'stable',
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Horarios',
      description: 'Crear y gestionar horarios de clases',
      icon: 'calendar_today',
      route: '/dashboard/horarios',
      color: 'warning',
      stats: 'Cargando...',
      gradient: 'card-gradient-amber',
      iconBg: 'bg-amber-600',
      progress: 0,
      trending: 'up',
      roles: ['COORDINATOR', 'ASSISTANT']
    }
  ];

  // Acciones rápidas mejoradas
  quickActions: QuickAction[] = [
    {
      title: 'Nueva Modalidad',
      icon: 'add_circle',
      color: 'bg-gradient-primary',
      description: 'Crear una nueva modalidad educativa',
      action: () => this.router.navigate(['/dashboard/modalidades']),
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Registrar Docente',
      icon: 'person_add',
      color: 'bg-gradient-success',
      description: 'Agregar un nuevo docente al sistema',
      action: () => this.router.navigate(['/dashboard/docentes']),
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Asignar Horario',
      icon: 'event_available',
      color: 'bg-gradient-warning',
      description: 'Crear nueva asignación de horario',
      action: () => this.router.navigate(['/dashboard/horarios']),
      roles: ['COORDINATOR', 'ASSISTANT']
    },
    {
      title: 'Mi Disponibilidad',
      icon: 'schedule',
      color: 'bg-gradient-success',
      description: 'Actualizar mi disponibilidad horaria',
      action: () => this.router.navigate(['/dashboard/docentes']),
      roles: ['TEACHER']
    }
  ];

  // Tarjetas de estadísticas dinámicas
  statsCards: StatCard[] = [
    {
      title: 'Docentes Activos',
      value: 0,
      icon: 'school',
      change: '+0%',
      changeType: 'neutral',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      description: 'Docentes registrados en el sistema',
      loading: true
    },
    {
      title: 'Grupos Activos',
      value: 0,
      icon: 'groups',
      change: '+0%',
      changeType: 'neutral',
      gradient: 'bg-gradient-to-br from-green-500 to-green-600',
      description: 'Grupos con horarios asignados',
      loading: true
    },
    {
      title: 'Clases Programadas',
      value: 0,
      icon: 'event',
      change: '0%',
      changeType: 'neutral',
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      description: 'Total de sesiones programadas',
      loading: true
    },
    {
      title: 'Problemas Detectados',
      value: 0,
      icon: 'warning',
      change: '+0',
      changeType: 'neutral',
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      description: 'Grupos con asignaciones incompletas',
      loading: true
    }
  ];

  ngOnInit(): void {
    // Actualizar la hora cada minuto
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);

    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Suscribirse a información del usuario
    this.userInfoService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isTeacher = user?.role === 'TEACHER';
        this.loadDashboardData();
      });

    // Suscribirse a notificaciones
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.updateStatsFromNotifications();
      });
  }

  private loadDashboardData(): void {
    if (this.isTeacher) {
      // Para docentes, solo necesitamos datos básicos
      this.loading = false;
      return;
    }

    // Para administradores, cargar todas las estadísticas
    this.loading = true;

    // ✅ Usar el nuevo servicio de dashboard
    this.dashboardService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
          this.updateStatsCards();
          this.updateDashboardCards();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loading = false;
        }
      });

    // Cargar notificaciones por separado
    this.notificationService.loadNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Notifications loaded successfully');
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  private updateStatsCards(): void {
    if (!this.dashboardStats) return;

    // ✅ Usar el método getTrends del servicio para obtener tendencias
    this.dashboardService.getTrends()
      .pipe(takeUntil(this.destroy$))
      .subscribe(trends => {
        // Actualizar las tarjetas de estadísticas con datos reales y tendencias
        this.statsCards[0] = {
          ...this.statsCards[0],
          value: this.dashboardStats!.totalTeachers,
          change: `${trends.teachersGrowth > 0 ? '+' : ''}${trends.teachersGrowth.toFixed(1)}%`,
          changeType: trends.teachersGrowth > 0 ? 'positive' : trends.teachersGrowth < 0 ? 'negative' : 'neutral',
          description: 'Docentes registrados en el sistema',
          loading: false
        };

        this.statsCards[1] = {
          ...this.statsCards[1],
          value: this.dashboardStats!.totalGroups,
          change: `${trends.groupsGrowth > 0 ? '+' : ''}${trends.groupsGrowth.toFixed(1)}%`,
          changeType: trends.groupsGrowth > 0 ? 'positive' : trends.groupsGrowth < 0 ? 'negative' : 'neutral',
          description: 'Grupos registrados en el sistema',
          loading: false
        };

        this.statsCards[2] = {
          ...this.statsCards[2],
          value: this.dashboardStats!.totalSessions,
          change: `${trends.sessionsGrowth > 0 ? '+' : ''}${trends.sessionsGrowth.toFixed(1)}%`,
          changeType: trends.sessionsGrowth > 0 ? 'positive' : trends.sessionsGrowth < 0 ? 'negative' : 'neutral',
          description: 'Sesiones de clase programadas',
          loading: false
        };
      });
  }

  private updateStatsFromNotifications(): void {
    const problemsCount = this.notifications.filter(n => n.severity === 'high' || n.severity === 'medium').length;

    this.statsCards[3] = {
      ...this.statsCards[3],
      value: problemsCount,
      change: problemsCount > 0 ? `+${problemsCount}` : '0',
      changeType: problemsCount > 0 ? 'negative' : 'positive',
      description: problemsCount > 0 ? 'Requieren atención inmediata' : 'Todo en orden',
      loading: false
    };
  }

  private updateDashboardCards(): void {
    if (!this.dashboardStats) return;

    // Actualizar las tarjetas del dashboard con datos reales
    this.dashboardCards.forEach(card => {
      switch (card.route) {
        case '/dashboard/docentes':
          card.stats = `${this.dashboardStats!.totalTeachers} docentes`;
          card.progress = Math.min(100, (this.dashboardStats!.totalTeachers / 30) * 100);
          break;
        case '/dashboard/grupos':
          card.stats = `${this.dashboardStats!.totalGroups} grupos`;
          card.progress = Math.min(100, (this.dashboardStats!.totalGroups / 20) * 100);
          break;
        case '/dashboard/cursos':
          card.stats = `${this.dashboardStats!.totalCourses} cursos`;
          card.progress = Math.min(100, (this.dashboardStats!.totalCourses / 50) * 100);
          break;
        case '/dashboard/ambientes':
          card.stats = `${this.dashboardStats!.totalSpaces} ambientes`;
          card.progress = Math.min(100, (this.dashboardStats!.totalSpaces / 25) * 100);
          break;
        case '/dashboard/horarios':
          card.stats = `${this.dashboardStats!.totalSessions} clases`;
          card.progress = this.dashboardStats!.completionRate;
          break;
      }
    });
  }

  // === MÉTODOS DE UI ===

  getUserDisplayName(): string {
    return this.userInfoService.getUserDisplayName();
  }

  getFirstName(): string {
    const fullName = this.getUserDisplayName();
    return fullName.split(' ')[0] || 'Usuario';
  }

  getWelcomeMessage(): string {
    if (this.isTeacher) {
      return 'Gestiona tu disponibilidad horaria y mantente al día con tus asignaciones académicas';
    }
    return 'Gestiona de manera inteligente y eficiente los horarios académicos de tu institución educativa';
  }

  getHeroIcon(): string {
    return this.isTeacher ? 'school' : 'schedule';
  }

  getFilteredQuickActions(): QuickAction[] {
    const userRole = this.userInfoService.getCurrentUser()?.role || 'TEACHER';
    return this.quickActions.filter(action => action.roles.includes(userRole));
  }

  getFilteredDashboardCards(): DashboardCard[] {
    const userRole = this.userInfoService.getCurrentUser()?.role || 'TEACHER';
    return this.dashboardCards.filter(card => card.roles.includes(userRole));
  }

  getHighPriorityNotifications(): GroupNotification[] {
    return this.notifications
      .filter(n => n.severity === 'high' || n.severity === 'medium')
      .slice(0, 6); // Mostrar máximo 6
  }

  // === MÉTODOS DE NOTIFICACIONES ===

  getNotificationIcon(type: GroupNotification['type']): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationCardClass(severity: GroupNotification['severity']): string {
    const classes = {
      high: 'border-red-200 bg-red-50/50',
      medium: 'border-yellow-200 bg-yellow-50/50',
      low: 'border-blue-200 bg-blue-50/50'
    };
    return classes[severity] || 'border-gray-200 bg-gray-50/50';
  }

  getNotificationIconClass(severity: GroupNotification['severity']): string {
    const classes = {
      high: 'bg-red-100 text-red-600',
      medium: 'bg-yellow-100 text-yellow-600',
      low: 'bg-blue-100 text-blue-600'
    };
    return classes[severity] || 'bg-gray-100 text-gray-600';
  }

  getSeverityBadgeClass(severity: GroupNotification['severity']): string {
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

  navigateToNotification(notification: GroupNotification): void {
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  // === MÉTODOS DE ACCIÓN ===

  onCardClick(card: DashboardCard): void {
    if (!card.disabled) {
      this.router.navigate([card.route]);
    }
  }

  onQuickAction(action: QuickAction): void {
    action.action();
  }
}
