// src/app/features/dashboard/layout/dashboard-layout.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay } from 'rxjs';

// Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { AuthService } from '../../../shared/services/auth.service';
import { PeriodService, Period } from '../../periods/services/period.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    RouterLinkActive,
    MatSelectModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <mat-sidenav-container class="h-screen">
        <!-- Sidebar Moderno -->
        <mat-sidenav
          #drawer
          class="border-r-0 shadow-2xl"
          fixedInViewport="true"
          [attr.role]="(isHandset$ | async) ? 'dialog' : 'navigation'"
          [mode]="(isHandset$ | async) ? 'over' : 'side'"
          [opened]="!(isHandset$ | async)">

          <!-- Sidebar Content -->
          <div class="h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/50">
            <!-- Logo Section -->
            <div class="p-6 border-b border-slate-200/50">
              <div
                class="flex items-center gap-3 cursor-pointer group transition-all duration-300 hover:scale-105"
                [routerLink]="'/dashboard'">
                <div class="relative">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <mat-icon class="text-white text-xl">schedule</mat-icon>
                  </div>
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div class="flex flex-col">
                  <span class="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    SistemaHorarios
                  </span>
                  <span class="text-xs text-slate-500 font-medium">v2.0</span>
                </div>
              </div>
            </div>

            <!-- Navigation Menu -->
            <nav class="p-4 space-y-2 flex-1 overflow-y-auto">
              <div
                *ngFor="let item of sidebarItems; trackBy: trackByRoute"
                class="relative">
                <a
                  [routerLink]="item.route"
                  routerLinkActive="active-nav-item"
                  [routerLinkActiveOptions]="{exact: item.exact}"
                  class="nav-item-link group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-slate-100/80 hover:shadow-md hover:translate-x-1"
                  [matTooltip]="item.title"
                  matTooltipPosition="right">

                  <div class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100/50 group-hover:bg-white/80 transition-all duration-300">
                    <mat-icon class="text-slate-600 group-hover:text-blue-600 transition-colors duration-300 text-lg">
                      {{ item.icon }}
                    </mat-icon>
                  </div>

                  <span class="font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-300">
                    {{ item.title }}
                  </span>

                  <!-- Badge para notificaciones -->
                  <div *ngIf="item.badge"
                       class="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                    {{ item.badge }}
                  </div>
                </a>
              </div>
            </nav>

            <!-- User Profile Section -->
            <div class="p-4 border-t border-slate-200/50 mt-auto">
              <div class="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <mat-icon class="text-white text-lg">person</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">{{ userName }}</p>
                  <p class="text-xs text-slate-500">Administrador</p>
                </div>
                <button mat-icon-button class="text-slate-400 hover:text-slate-600">
                  <mat-icon class="text-lg">more_vert</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-sidenav>

        <!-- Main Content -->
        <mat-sidenav-content class="flex flex-col">
          <!-- Modern Toolbar -->
          <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
            <div class="flex items-center justify-between px-6 py-4">
              <!-- Left Section -->
              <div class="flex items-center gap-4">
                <button
                  *ngIf="isHandset$ | async"
                  mat-icon-button
                  (click)="drawer.toggle()"
                  class="text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200 rounded-lg">
                  <mat-icon>menu</mat-icon>
                </button>

                <div class="flex flex-col">
                  <h1 class="text-xl font-bold text-slate-800">{{ getCurrentPageTitle() }}</h1>
                  <p class="text-sm text-slate-500 hidden sm:block">{{ getCurrentPageDescription() }}</p>
                </div>
              </div>

              <!-- Center Section - Period Selector -->
              <div class="hidden md:flex items-center gap-4" *ngIf="periods.length > 0">
                <div class="flex items-center gap-2 px-4 py-2 bg-slate-100/80 rounded-lg">
                  <mat-icon class="text-blue-600 text-lg">event</mat-icon>
                  <span class="text-sm font-medium text-slate-700">Periodo:</span>
                  <mat-select
                    [value]="currentPeriod?.uuid"
                    (selectionChange)="onPeriodChange($event.value)"
                    class="border-0 bg-transparent text-sm font-semibold text-slate-800 min-w-0">
                    <mat-select-trigger>
                      <span class="truncate">{{ currentPeriod?.name || 'Seleccionar' }}</span>
                    </mat-select-trigger>
                    <mat-option *ngFor="let period of periods" [value]="period.uuid">
                      {{ period.name }}
                    </mat-option>
                    <mat-divider></mat-divider>
                    <mat-option [value]="'manage'" class="text-blue-600">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-lg">settings</mat-icon>
                        <span>Gestionar periodos</span>
                      </div>
                    </mat-option>
                  </mat-select>
                </div>
              </div>

              <!-- Right Section -->
              <div class="flex items-center gap-3">
                <!-- Quick Actions -->
                <div class="hidden lg:flex items-center gap-2">
                  <button
                    mat-icon-button
                    class="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg"
                    [matTooltip]="'Notificaciones'"
                    matBadge="3"
                    matBadgeColor="warn"
                    matBadgeSize="small">
                    <mat-icon class="text-lg">notifications</mat-icon>
                  </button>

                  <button
                    mat-icon-button
                    class="text-slate-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200 rounded-lg"
                    [matTooltip]="'Búsqueda rápida'">
                    <mat-icon class="text-lg">search</mat-icon>
                  </button>
                </div>

                <!-- Time Display -->
                <div class="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100/50 rounded-lg">
                  <mat-icon class="text-slate-500 text-lg">access_time</mat-icon>
                  <span class="text-sm font-medium text-slate-700">
                    {{ currentTime | date:'HH:mm' }}
                  </span>
                </div>

                <!-- User Menu -->
                <div class="flex items-center gap-2">
                  <span class="hidden lg:block text-sm font-medium text-slate-700">
                    {{ getGreeting() }}, {{ userName }}
                  </span>
                  <button
                    mat-icon-button
                    [matMenuTriggerFor]="userMenu"
                    class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200">
                    <mat-icon class="text-lg">person</mat-icon>
                  </button>
                </div>

                <!-- User Menu -->
                <mat-menu #userMenu="matMenu" class="mt-2">
                  <div class="p-4 border-b border-slate-200">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <mat-icon class="text-white">person</mat-icon>
                      </div>
                      <div>
                        <p class="font-semibold text-slate-800">{{ userName }}</p>
                        <p class="text-sm text-slate-500">admin.com</p>
                      </div>
                    </div>
                  </div>

                  <button mat-menu-item class="flex items-center gap-3 py-3">
                    <mat-icon class="text-slate-600">person</mat-icon>
                    <span>Mi Perfil</span>
                  </button>
                  <button mat-menu-item class="flex items-center gap-3 py-3">
                    <mat-icon class="text-slate-600">settings</mat-icon>
                    <span>Configuración</span>
                  </button>
                  <button mat-menu-item class="flex items-center gap-3 py-3">
                    <mat-icon class="text-slate-600">help</mat-icon>
                    <span>Ayuda</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="logout()" class="flex items-center gap-3 py-3 text-red-600">
                    <mat-icon>logout</mat-icon>
                    <span>Cerrar Sesión</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          </header>

          <!-- Page Content -->
          <main class="flex-1 overflow-auto">
            <!-- Period Alert -->
            <div
              *ngIf="currentPeriod"
              class="mx-6 mt-4 p-4 bg-blue-50/80 border border-blue-200/50 rounded-xl backdrop-blur-sm">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <mat-icon class="text-blue-600 text-lg">info</mat-icon>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-800">
                    Trabajando en el periodo: <span class="font-bold">{{ currentPeriod.name }}</span>
                  </p>
                  <p class="text-xs text-blue-600 mt-1">
                    {{ currentPeriod.startDate | date:'d MMM y' }} - {{ currentPeriod.endDate | date:'d MMM y' }}
                  </p>
                </div>
                <button mat-icon-button class="text-blue-400 hover:text-blue-600">
                  <mat-icon class="text-lg">close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Router Outlet -->
            <div class="p-6">
              <router-outlet></router-outlet>
            </div>
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    /* Active navigation item */
    ::ng-deep .active-nav-item {
      @apply bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-r-2 border-blue-500 shadow-sm;
    }

    ::ng-deep .active-nav-item .mat-icon {
      @apply text-blue-600;
    }

    ::ng-deep .active-nav-item span {
      @apply text-blue-800 font-semibold;
    }

    /* Material Select Customization */
    ::ng-deep .mat-mdc-select-value {
      color: inherit !important;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      @apply w-2;
    }

    ::-webkit-scrollbar-track {
      @apply bg-slate-100 rounded-full;
    }

    ::-webkit-scrollbar-thumb {
      @apply bg-slate-300 rounded-full hover:bg-slate-400;
    }

    /* Animation for navigation items */
    .nav-item-link {
      position: relative;
      overflow: hidden;
    }

    .nav-item-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }

    .nav-item-link:hover::before {
      left: 100%;
    }
  `]
})
export class DashboardLayoutComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private periodService = inject(PeriodService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  userName = 'Usuario Administrador';
  currentTime = new Date();
  periods: Period[] = [];
  currentPeriod: Period | null = null;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Navegación del sidebar con badges y configuración mejorada
  sidebarItems = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      exact: true,
      description: 'Panel principal del sistema'
    },
    {
      title: 'Modalidades',
      icon: 'school',
      route: '/dashboard/modalidades',
      exact: false,
      description: 'Gestionar modalidades educativas'
    },
    {
      title: 'Carreras',
      icon: 'account_balance',
      route: '/dashboard/carreras',
      exact: false,
      description: 'Administrar carreras profesionales'
    },
    {
      title: 'Periodos',
      icon: 'event',
      route: '/dashboard/periodos',
      exact: false,
      description: 'Gestionar periodos académicos'
    },
    {
      title: 'Docentes',
      icon: 'person',
      route: '/dashboard/docentes',
      exact: false,
      badge: '2',
      description: 'Gestión de profesores'
    },
    {
      title: 'Grupos',
      icon: 'groups',
      route: '/dashboard/grupos',
      exact: false,
      description: 'Gestionar grupos de estudiantes'
    },
    {
      title: 'Cursos',
      icon: 'book',
      route: '/dashboard/cursos',
      exact: false,
      description: 'Administrar materias y asignaturas'
    },
    {
      title: 'Ambientes',
      icon: 'room',
      route: '/dashboard/ambientes',
      exact: false,
      description: 'Gestionar aulas y laboratorios'
    },
    {
      title: 'Turnos',
      icon: 'schedule',
      route: '/dashboard/turnos',
      exact: false,
      description: 'Configurar horarios pedagógicos'
    },
    {
      title: 'Horarios',
      icon: 'calendar_today',
      route: '/dashboard/horarios',
      exact: false,
      description: 'Asignación de horarios de clases'
    }
  ];

  private pageTitles: { [key: string]: string } = {
    '/dashboard': 'Panel de Control',
    '/dashboard/modalidades': 'Modalidades Educativas',
    '/dashboard/carreras': 'Carreras Profesionales',
    '/dashboard/periodos': 'Periodos Académicos',
    '/dashboard/docentes': 'Gestión de Docentes',
    '/dashboard/grupos': 'Grupos de Estudiantes',
    '/dashboard/cursos': 'Gestión de Cursos',
    '/dashboard/ambientes': 'Ambientes de Aprendizaje',
    '/dashboard/turnos': 'Turnos y Horarios',
    '/dashboard/horarios': 'Asignación de Horarios'
  };

  private pageDescriptions: { [key: string]: string } = {
    '/dashboard': 'Resumen general del sistema',
    '/dashboard/modalidades': 'Gestiona los tipos de modalidades educativas',
    '/dashboard/carreras': 'Administra las carreras profesionales',
    '/dashboard/periodos': 'Configura los periodos académicos',
    '/dashboard/docentes': 'Gestiona la información de los docentes',
    '/dashboard/grupos': 'Administra los grupos de estudiantes',
    '/dashboard/cursos': 'Gestiona materias y asignaturas',
    '/dashboard/ambientes': 'Configura aulas y laboratorios',
    '/dashboard/turnos': 'Define turnos y horas pedagógicas',
    '/dashboard/horarios': 'Crea y administra horarios de clases'
  };

  ngOnInit(): void {
    // Actualizar la hora cada minuto
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);

    this.loadPeriods();
    this.subscribeToCurrentPeriod();
  }

  loadPeriods(): void {
    this.periodService.getAllPeriods().subscribe({
      next: (response) => {
        this.periods = Array.isArray(response.data) ? response.data : [response.data];
        if (!this.currentPeriod && this.periods.length > 0) {
          this.periodService.setCurrentPeriod(this.periods[0]);
        }
      },
      error: (error) => {
        console.error('Error al cargar periodos:', error);
        this.showNotification('Error al cargar periodos', 'error');
      }
    });
  }

  private subscribeToCurrentPeriod(): void {
    this.periodService.currentPeriod$.subscribe(period => {
      this.currentPeriod = period;
    });
  }

  onPeriodChange(value: string): void {
    if (value === 'manage') {
      this.router.navigate(['/dashboard/periodos']);
      return;
    }

    const selectedPeriod = this.periods.find(p => p.uuid === value);
    if (selectedPeriod) {
      this.periodService.setCurrentPeriod(selectedPeriod);
      this.showNotification(`Periodo ${selectedPeriod.name} seleccionado`, 'success');
    }
  }

  getCurrentPageTitle(): string {
    const currentUrl = this.router.url;
    return this.pageTitles[currentUrl] || 'Sistema de Horarios';
  }

  getCurrentPageDescription(): string {
    const currentUrl = this.router.url;
    return this.pageDescriptions[currentUrl] || 'Sistema de gestión académica';
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  trackByRoute(index: number, item: any): string {
    return item.route;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`${type}-snackbar`],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
