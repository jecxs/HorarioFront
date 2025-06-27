// src/app/features/dashboard/dashboard-home.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

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
}

interface QuickAction {
  title: string;
  icon: string;
  color: string;
  action: () => void;
  description: string;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  gradient: string;
  description: string;
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
    MatChipsModule
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
                  ¡Bienvenido de vuelta!
                </h1>
                <p class="text-lg lg:text-xl text-slate-600 mb-6 max-w-2xl">
                  Gestiona de manera inteligente y eficiente los horarios académicos de tu institución educativa
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
                    <mat-icon class="text-white text-6xl lg:text-8xl">schedule</mat-icon>
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
                *ngFor="let action of quickActions"
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
                  <mat-icon class="text-white text-xl">{{ stat.icon }}</mat-icon>
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

              <h3 class="text-3xl font-bold text-slate-800 mb-2">{{ stat.value }}</h3>
              <p class="text-slate-600 font-medium mb-1">{{ stat.title }}</p>
              <p class="text-sm text-slate-500">{{ stat.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Features Grid -->
      <div class="px-6 pb-12">
        <div class="mx-auto max-w-7xl">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <mat-icon class="text-white">apps</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Módulos del Sistema</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              *ngFor="let card of dashboardCards"
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

      <!-- Recent Activity Section -->
      <div class="px-6 pb-12">
        <div class="mx-auto max-w-7xl">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <mat-icon class="text-white">history</mat-icon>
                </div>
                <h2 class="text-2xl font-bold text-slate-800">Actividad Reciente</h2>
              </div>
              <button class="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200">
                Ver todo
              </button>
            </div>

            <div class="space-y-4">
              <div *ngFor="let activity of recentActivities"
                   class="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors duration-200">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                     [ngClass]="activity.iconBg">
                  <mat-icon class="text-white text-sm">{{ activity.icon }}</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800">{{ activity.title }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ activity.description }}</p>
                </div>
                <div class="text-xs text-slate-400 flex-shrink-0">
                  {{ activity.time }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom animations */
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    /* Gradient classes */
    .bg-gradient-primary {
      @apply bg-gradient-to-br from-blue-500 to-blue-600;
    }

    .bg-gradient-secondary {
      @apply bg-gradient-to-br from-purple-500 to-purple-600;
    }

    .bg-gradient-success {
      @apply bg-gradient-to-br from-green-500 to-green-600;
    }

    .bg-gradient-warning {
      @apply bg-gradient-to-br from-yellow-500 to-orange-500;
    }

    .bg-gradient-accent {
      @apply bg-gradient-to-br from-pink-500 to-rose-600;
    }

    /* Card gradient backgrounds */
    .card-gradient-blue {
      @apply bg-gradient-to-br from-blue-500 to-blue-600;
    }

    .card-gradient-purple {
      @apply bg-gradient-to-br from-purple-500 to-indigo-600;
    }

    .card-gradient-green {
      @apply bg-gradient-to-br from-green-500 to-emerald-600;
    }

    .card-gradient-orange {
      @apply bg-gradient-to-br from-orange-500 to-red-500;
    }

    .card-gradient-pink {
      @apply bg-gradient-to-br from-pink-500 to-rose-600;
    }

    .card-gradient-teal {
      @apply bg-gradient-to-br from-teal-500 to-cyan-600;
    }

    .card-gradient-indigo {
      @apply bg-gradient-to-br from-indigo-500 to-purple-600;
    }

    .card-gradient-amber {
      @apply bg-gradient-to-br from-amber-500 to-orange-600;
    }

    /* Line clamp utility */
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Hover effects */
    .group:hover .group-hover\\:scale-110 {
      transform: scale(1.1);
    }

    .group:hover .group-hover\\:translate-x-1 {
      transform: translateX(0.25rem);
    }

    /* Responsive grid */
    @media (max-width: 768px) {
      .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4 {
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }
    }

    @media (min-width: 768px) and (max-width: 1024px) {
      .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 1024px) and (max-width: 1280px) {
      .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `]
})
export class DashboardHomeComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  currentTime = new Date();

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
      stats: '2 activas',
      gradient: 'card-gradient-blue',
      iconBg: 'bg-blue-600',
      progress: 85,
      trending: 'stable'
    },
    {
      title: 'Carreras',
      description: 'Administrar carreras profesionales',
      icon: 'account_balance',
      route: '/dashboard/carreras',
      color: 'secondary',
      stats: '8 carreras',
      gradient: 'card-gradient-purple',
      iconBg: 'bg-purple-600',
      progress: 92,
      trending: 'up'
    },
    {
      title: 'Docentes',
      description: 'Gestión de profesores y disponibilidad',
      icon: 'person',
      route: '/dashboard/docentes',
      color: 'success',
      stats: '25 docentes',
      gradient: 'card-gradient-green',
      iconBg: 'bg-green-600',
      progress: 78,
      trending: 'up'
    },
    {
      title: 'Grupos',
      description: 'Administrar secciones y grupos',
      icon: 'groups',
      route: '/dashboard/grupos',
      color: 'warning',
      stats: '15 grupos',
      gradient: 'card-gradient-orange',
      iconBg: 'bg-orange-600',
      progress: 65,
      trending: 'stable'
    },
    {
      title: 'Cursos',
      description: 'Gestión de materias y asignaturas',
      icon: 'book',
      route: '/dashboard/cursos',
      color: 'accent',
      stats: '45 cursos',
      gradient: 'card-gradient-pink',
      iconBg: 'bg-pink-600',
      progress: 88,
      trending: 'up'
    },
    {
      title: 'Ambientes',
      description: 'Administrar aulas y laboratorios',
      icon: 'room',
      route: '/dashboard/ambientes',
      color: 'primary',
      stats: '20 ambientes',
      gradient: 'card-gradient-teal',
      iconBg: 'bg-teal-600',
      progress: 95,
      trending: 'stable'
    },
    {
      title: 'Turnos',
      description: 'Configurar turnos y horas pedagógicas',
      icon: 'schedule',
      route: '/dashboard/turnos',
      color: 'secondary',
      stats: '3 turnos',
      gradient: 'card-gradient-indigo',
      iconBg: 'bg-indigo-600',
      progress: 100,
      trending: 'stable'
    },
    {
      title: 'Horarios',
      description: 'Crear y gestionar horarios de clases',
      icon: 'calendar_today',
      route: '/dashboard/horarios',
      color: 'warning',
      stats: 'En progreso',
      gradient: 'card-gradient-amber',
      iconBg: 'bg-amber-600',
      progress: 45,
      trending: 'up'
    }
  ];

  // Acciones rápidas mejoradas
  quickActions: QuickAction[] = [
    {
      title: 'Nueva Modalidad',
      icon: 'add_circle',
      color: 'bg-gradient-primary',
      description: 'Crear una nueva modalidad educativa',
      action: () => this.router.navigate(['/dashboard/modalidades'])
    },
    {
      title: 'Registrar Docente',
      icon: 'person_add',
      color: 'bg-gradient-success',
      description: 'Agregar un nuevo docente al sistema',
      action: () => this.router.navigate(['/dashboard/docentes'])
    },
    {
      title: 'Asignar Horario',
      icon: 'event_available',
      color: 'bg-gradient-warning',
      description: 'Crear nueva asignación de horario',
      action: () => this.router.navigate(['/dashboard/horarios'])
    }
  ];

  // Tarjetas de estadísticas
  statsCards: StatCard[] = [
    {
      title: 'Docentes Activos',
      value: 25,
      icon: 'school',
      change: '+12%',
      changeType: 'positive',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      description: 'Respecto al periodo anterior'
    },
    {
      title: 'Grupos Activos',
      value: 15,
      icon: 'groups',
      change: '+5%',
      changeType: 'positive',
      gradient: 'bg-gradient-to-br from-green-500 to-green-600',
      description: 'Grupos con horarios asignados'
    },
    {
      title: 'Clases Programadas',
      value: 120,
      icon: 'event',
      change: '0%',
      changeType: 'neutral',
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      description: 'Total de sesiones semanales'
    },
    {
      title: 'Ambientes Disponibles',
      value: 20,
      icon: 'room',
      change: '+2',
      changeType: 'positive',
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      description: 'Aulas y laboratorios operativos'
    }
  ];

  // Actividades recientes
  recentActivities = [
    {
      title: 'Nuevo docente registrado',
      description: 'Juan Pérez - Departamento de Ingeniería',
      time: 'Hace 2 horas',
      icon: 'person_add',
      iconBg: 'bg-green-500'
    },
    {
      title: 'Horario actualizado',
      description: 'Grupo A - Ciclo 3 - Sistemas',
      time: 'Hace 4 horas',
      icon: 'schedule',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Nueva modalidad creada',
      description: 'Instituto Técnico Superior',
      time: 'Hace 1 día',
      icon: 'school',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Ambiente actualizado',
      description: 'Laboratorio de Cómputo 2',
      time: 'Hace 2 días',
      icon: 'room',
      iconBg: 'bg-orange-500'
    }
  ];

  ngOnInit(): void {
    // Actualizar la hora cada minuto
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  onCardClick(card: DashboardCard): void {
    if (!card.disabled) {
      this.router.navigate([card.route]);
    }
  }

  onQuickAction(action: QuickAction): void {
    action.action();
  }
}
