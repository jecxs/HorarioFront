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

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  stats?: string;
  disabled?: boolean;
}

interface QuickAction {
  title: string;
  icon: string;
  color: string;
  action: () => void;
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
    MatRippleModule
  ],
  templateUrl: `dashboard.component.html`,
  styleUrls: ['./dashboard.component.scss']
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
      title: 'Modalidades Educativas',
      description: 'Gestionar modalidades educativas del instituto',
      icon: 'school',
      route: '/dashboard/modalidades',
      color: 'primary',
      stats: '2 activas',
      disabled: false
    },
    {
      title: 'Carreras',
      description: 'Administrar carreras profesionales',
      icon: 'account_balance',
      route: '/dashboard/carreras',
      color: 'accent',
      stats: '8 carreras',
      disabled: false
    },
    {
      title: 'Docentes',
      description: 'Gestión de profesores y disponibilidad',
      icon: 'person',
      route: '/dashboard/docentes',
      color: 'warn',
      stats: '25 docentes',
      disabled: false
    },
    {
      title: 'Grupos de Estudiantes',
      description: 'Administrar secciones y grupos',
      icon: 'groups',
      route: '/dashboard/grupos',
      color: 'primary',
      stats: '15 grupos',
      disabled: false
    },
    {
      title: 'Cursos',
      description: 'Gestión de materias y asignaturas',
      icon: 'book',
      route: '/dashboard/cursos',
      color: 'accent',
      stats: '45 cursos',
      disabled: false
    },
    {
      title: 'Ambientes de Aprendizaje',
      description: 'Administrar aulas y laboratorios',
      icon: 'room',
      route: '/dashboard/ambientes',
      color: 'warn',
      stats: '20 ambientes',
      disabled: false
    },
    {
      title: 'Turnos y Horarios',
      description: 'Configurar turnos y horas pedagógicas',
      icon: 'schedule',
      route: '/dashboard/turnos',
      color: 'primary',
      stats: '3 turnos',
      disabled: false
    },
    {
      title: 'Asignación de Horarios',
      description: 'Crear y gestionar horarios de clases',
      icon: 'calendar_today',
      route: '/dashboard/horarios',
      color: 'accent',
      stats: 'En progreso',
      disabled: false
    }
  ];

  // Acciones rápidas
  quickActions: QuickAction[] = [
    {
      title: 'Nueva Modalidad',
      icon: 'school',
      color: 'primary',
      action: () => this.router.navigate(['/dashboard/modalidades'])
    },
    {
      title: 'Nuevo Docente',
      icon: 'person_add',
      color: 'accent',
      action: () => this.router.navigate(['/dashboard/docentes'])
    },
    {
      title: 'Asignar Horario',
      icon: 'event_available',
      color: 'warn',
      action: () => this.router.navigate(['/dashboard/horarios'])
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
