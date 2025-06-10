// src/app/features/dashboard/layout/dashboard-layout.component.ts (modificación)
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
    MatSnackBarModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- Sidebar -->
      <mat-sidenav
        #drawer
        class="sidenav"
        fixedInViewport="true"
        [attr.role]="(isHandset$ | async) ? 'dialog' : 'navigation'"
        [mode]="(isHandset$ | async) ? 'over' : 'side'"
        [opened]="!(isHandset$ | async)">

        <!-- Logo y título del sidebar -->
        <div class="sidebar-header">
          <div class="logo-container" [routerLink]="'/dashboard'">
            <mat-icon class="logo-icon">schedule</mat-icon>
            <span class="logo-text">SistemaHorarios</span>
          </div>
        </div>

        <!-- Navegación del sidebar -->
        <mat-nav-list class="sidebar-nav">
          <mat-list-item
            *ngFor="let item of sidebarItems"
            [routerLink]="item.route"
            routerLinkActive="active-link"
            [routerLinkActiveOptions]="{exact: item.exact}"
            class="nav-item">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.title }}</span>
          </mat-list-item>
        </mat-nav-list>

        <!-- Footer del sidebar -->
        <div class="sidebar-footer">
          <mat-list-item class="user-info">
            <mat-icon matListItemIcon>account_circle</mat-icon>
            <span matListItemTitle>{{ userName }}</span>
          </mat-list-item>
        </div>
      </mat-sidenav>

      <!-- Contenido principal -->
      <mat-sidenav-content>
        <!-- Header/Toolbar -->
        <mat-toolbar class="main-toolbar" color="primary">
          <button
            type="button"
            aria-label="Toggle sidenav"
            mat-icon-button
            (click)="drawer.toggle()"
            *ngIf="isHandset$ | async">
            <mat-icon aria-label="Side nav toggle icon">menu</mat-icon>
          </button>

          <span class="toolbar-title">{{ getCurrentPageTitle() }}</span>

          <div class="toolbar-spacer"></div>

          <!-- Selector de Periodo Académico -->
          <div class="period-selector" *ngIf="periods.length > 0">
            <span class="period-label">Periodo:</span>
            <mat-select
              [value]="currentPeriod?.uuid"
              (selectionChange)="onPeriodChange($event.value)"
              class="period-select">
              <mat-select-trigger>
                <span class="period-selected">{{ currentPeriod?.name || 'Seleccionar periodo' }}</span>
              </mat-select-trigger>
              <mat-option *ngFor="let period of periods" [value]="period.uuid">
                {{ period.name }}
              </mat-option>
              <mat-option [value]="'manage'" class="manage-option">
                <mat-icon>settings</mat-icon> Gestionar periodos
              </mat-option>
            </mat-select>
          </div>

          <!-- Información del usuario y menú -->
          <div class="user-section">
            <span class="greeting">{{ getGreeting() }}, {{ userName }}</span>
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-button">
              <mat-icon>account_circle</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>person</mat-icon>
                <span>Mi Perfil</span>
              </button>
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Configuración</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>exit_to_app</mat-icon>
                <span>Cerrar Sesión</span>
              </button>
            </mat-menu>
          </div>
        </mat-toolbar>

        <!-- Contenido dinámico -->
        <div class="page-content">
          <!-- Alerta de periodo seleccionado -->
          <div class="period-alert" *ngIf="currentPeriod">
            <mat-icon>info</mat-icon>
            <span>Trabajando en el periodo: <strong>{{ currentPeriod.name }}</strong></span>
            <span class="period-dates">
              ({{ currentPeriod.startDate | date }} - {{ currentPeriod.endDate | date }})
            </span>
          </div>

          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private periodService = inject(PeriodService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  userName = 'Usuario'; // Esto se puede obtener del token JWT
  currentTime = new Date();
  periods: Period[] = [];
  currentPeriod: Period | null = null;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Navegación del sidebar
  sidebarItems = [
    { title: 'Inicio', icon: 'dashboard', route: '/dashboard', exact: true },
    { title: 'Modalidades', icon: 'school', route: '/dashboard/modalidades', exact: false },
    { title: 'Carreras', icon: 'account_balance', route: '/dashboard/carreras', exact: false },
    { title: 'Periodos', icon: 'date_range', route: '/dashboard/periodos', exact: false },
    { title: 'Docentes', icon: 'person', route: '/dashboard/docentes', exact: false },
    { title: 'Grupos', icon: 'groups', route: '/dashboard/grupos', exact: false },
    { title: 'Cursos', icon: 'book', route: '/dashboard/cursos', exact: false },
    { title: 'Ambientes', icon: 'room', route: '/dashboard/ambientes', exact: false },
    { title: 'Turnos', icon: 'schedule', route: '/dashboard/turnos', exact: false },
    { title: 'Horarios', icon: 'calendar_today', route: '/dashboard/horarios', exact: false }
  ];

  private pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/dashboard/modalidades': 'Modalidades Educativas',
    '/dashboard/carreras': 'Carreras',
    '/dashboard/periodos': 'Periodos Académicos',
    '/dashboard/docentes': 'Docentes',
    '/dashboard/grupos': 'Grupos de Estudiantes',
    '/dashboard/cursos': 'Cursos',
    '/dashboard/ambientes': 'Ambientes de Aprendizaje',
    '/dashboard/turnos': 'Turnos y Horarios',
    '/dashboard/horarios': 'Asignación de Horarios'
  };

  ngOnInit(): void {
    // Actualizar la hora cada minuto
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);

    // Cargar periodos disponibles
    this.loadPeriods();

    // Suscribirse a cambios en el periodo actual
    this.periodService.currentPeriod$.subscribe(period => {
      this.currentPeriod = period;

      // Si no hay periodo seleccionado y hay periodos disponibles, seleccionar el primero
      if (!this.currentPeriod && this.periods.length > 0) {
        this.periodService.setCurrentPeriod(this.periods[0]);
      }
    });
  }

  loadPeriods(): void {
    this.periodService.getAllPeriods().subscribe({
      next: (response) => {
        this.periods = Array.isArray(response.data) ? response.data : [response.data];

        // Si no hay periodo seleccionado y hay periodos disponibles, seleccionar el primero
        if (!this.currentPeriod && this.periods.length > 0) {
          this.periodService.setCurrentPeriod(this.periods[0]);
        }
      },
      error: (error) => {
        console.error('Error al cargar periodos:', error);
        this.snackBar.open('Error al cargar periodos. Por favor, inténtelo de nuevo.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }

  onPeriodChange(value: string): void {
    // Si seleccionó "Gestionar periodos"
    if (value === 'manage') {
      this.router.navigate(['/dashboard/periodos']);
      return;
    }

    // Buscar el periodo seleccionado
    const selectedPeriod = this.periods.find(p => p.uuid === value);
    if (selectedPeriod) {
      this.periodService.setCurrentPeriod(selectedPeriod);
      this.snackBar.open(`Periodo ${selectedPeriod.name} seleccionado`, 'Cerrar', {
        duration: 3000,
      });
    }
  }

  getCurrentPageTitle(): string {
    const currentUrl = this.router.url;
    return this.pageTitles[currentUrl] || 'Sistema de Horarios';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
