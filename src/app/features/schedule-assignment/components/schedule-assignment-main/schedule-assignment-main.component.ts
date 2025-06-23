// src/app/features/schedule-assignment/components/schedule-assignment-main/schedule-assignment-main.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { ClassSessionService } from '../../services/class-session.service';

interface AssignmentMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  advantages: string[];
}

@Component({
  selector: 'app-schedule-assignment-main',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule
  ],
  template: `
    <div class="assignment-container">
      <div class="assignment-header">
        <h1>Asignación de Horarios</h1>
        <p class="subtitle">Seleccione el modo de asignación que mejor se adapte a sus necesidades</p>
      </div>

      <div class="modes-grid">
        <mat-card
          *ngFor="let mode of assignmentModes"
          class="mode-card"
          [class.primary-mode]="mode.color === 'primary'"
          [class.accent-mode]="mode.color === 'accent'"
          [class.warn-mode]="mode.color === 'warn'"
          matRipple
          (click)="selectMode(mode)">

          <mat-card-content>
            <div class="mode-icon">
              <mat-icon [style.color]="getIconColor(mode.color)">{{ mode.icon }}</mat-icon>
            </div>

            <h2 class="mode-title">{{ mode.title }}</h2>
            <p class="mode-description">{{ mode.description }}</p>

            <div class="advantages">
              <h4>Ventajas:</h4>
              <ul>
                <li *ngFor="let advantage of mode.advantages">
                  <mat-icon class="check-icon">check_circle</mat-icon>
                  {{ advantage }}
                </li>
              </ul>
            </div>

            <button
              mat-raised-button
              [color]="mode.color"
              class="select-button">
              <mat-icon>arrow_forward</mat-icon>
              Seleccionar
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="tips-section">
        <mat-card class="tips-card">
          <mat-card-content>
            <div class="tips-header">
              <mat-icon>tips_and_updates</mat-icon>
              <h3>Consejos para la asignación</h3>
            </div>
            <ul class="tips-list">
              <li>
                <strong>Por Docente:</strong> Ideal cuando necesita organizar el horario completo de un profesor específico.
              </li>
              <li>
                <strong>Por Grupo:</strong> Perfecto para crear el horario semanal de una sección de estudiantes.
              </li>
              <li>
                <strong>Por Curso:</strong> Útil cuando necesita distribuir las horas de una materia entre varios grupos.
              </li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .assignment-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .assignment-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .assignment-header h1 {
      font-size: 32px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #333;
    }

    .subtitle {
      font-size: 18px;
      color: #666;
      margin: 0;
    }

    .modes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .mode-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 12px;
      overflow: hidden;
    }

    .mode-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .primary-mode {
      border-top: 4px solid #3f51b5;
    }

    .accent-mode {
      border-top: 4px solid #ff4081;
    }

    .warn-mode {
      border-top: 4px solid #ff9800;
    }

    .mode-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .mode-icon mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .mode-title {
      text-align: center;
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 12px;
      color: #333;
    }

    .mode-description {
      text-align: center;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .advantages {
      margin-bottom: 24px;
    }

    .advantages h4 {
      color: #555;
      margin-bottom: 12px;
      font-weight: 500;
    }

    .advantages ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .advantages li {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
      color: #666;
    }

    .check-icon {
      font-size: 18px;
      color: #4caf50;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .select-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
    }

    .tips-section {
      max-width: 800px;
      margin: 0 auto;
    }

    .tips-card {
      background-color: #f5f5f5;
      border-radius: 12px;
    }

    .tips-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .tips-header mat-icon {
      color: #ffc107;
      margin-right: 12px;
      font-size: 28px;
    }

    .tips-header h3 {
      margin: 0;
      color: #333;
      font-weight: 500;
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tips-list li {
      margin-bottom: 12px;
      line-height: 1.6;
      color: #666;
    }

    .tips-list strong {
      color: #333;
    }

    @media (max-width: 768px) {
      .modes-grid {
        grid-template-columns: 1fr;
      }

      .assignment-header h1 {
        font-size: 24px;
      }

      .subtitle {
        font-size: 16px;
      }
    }
  `]
})
export class ScheduleAssignmentMainComponent implements OnInit {
  private router = inject(Router);
  private classSessionService = inject(ClassSessionService);

  assignmentModes: AssignmentMode[] = [
    {
      id: 'by-teacher',
      title: 'Por Docente',
      description: 'Asigne clases seleccionando primero al docente y luego distribuyendo sus horas disponibles.',
      icon: 'person',
      route: '/dashboard/horarios/by-teacher',
      color: 'primary',
      advantages: [
        'Visualización completa del horario del docente',
        'Evita sobrecargar a un profesor',
        'Respeta la disponibilidad del docente',
        'Ideal para docentes con pocas horas'
      ]
    },
    {
      id: 'by-group',
      title: 'Por Grupo',
      description: 'Cree el horario completo de un grupo o sección de estudiantes.',
      icon: 'groups',
      route: '/dashboard/horarios/by-group',
      color: 'accent',
      advantages: [
        'Vista completa del horario estudiantil',
        'Distribución equilibrada de materias',
        'Evita huecos en el horario del grupo',
        'Recomendado para inicio de periodo'
      ]
    },
    {
      id: 'by-course',
      title: 'Por Curso',
      description: 'Distribuya las horas de un curso específico entre diferentes grupos y horarios.',
      icon: 'book',
      route: '/dashboard/horarios/by-course',
      color: 'warn',
      advantages: [
        'Asignación rápida de una materia',
        'Vista de todos los grupos que llevan el curso',
        'Control de horas totales del curso',
        'Útil para cursos compartidos'
      ]
    }
  ];

  ngOnInit(): void {
    // Limpiar cualquier estado previo
    this.classSessionService.clearCache();
  }

  selectMode(mode: AssignmentMode): void {
    // Actualizar el estado del servicio
    const modeMap: { [key: string]: 'BY_TEACHER' | 'BY_GROUP' | 'BY_COURSE' } = {
      'by-teacher': 'BY_TEACHER',
      'by-group': 'BY_GROUP',
      'by-course': 'BY_COURSE'
    };

    this.classSessionService.updateAssignmentState({
      mode: modeMap[mode.id]
    });

    // Navegar a la ruta correspondiente
    this.router.navigate([mode.route]);
  }

  getIconColor(color: string): string {
    const colorMap: { [key: string]: string } = {
      'primary': '#3f51b5',
      'accent': '#ff4081',
      'warn': '#ff9800'
    };
    return colorMap[color] || '#333';
  }
}
