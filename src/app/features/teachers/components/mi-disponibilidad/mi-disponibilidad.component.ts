// src/app/features/docentes/components/mi-disponibilidad/mi-disponibilidad.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { finalize } from 'rxjs/operators';

import { MeService, UserProfile } from '../../../../shared/services/me.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { TeacherWithAvailabilitiesResponse } from '../../models/docente.model';
import { TeacherAvailabilityResponse } from '../../models/disponibilidad.model';
import { DisponibilidadListComponent } from '../disponibilidad/disponibilidad-list.component';
import { DisponibilidadFormComponent } from '../disponibilidad/disponibilidad-form.component';

@Component({
  selector: 'app-mi-disponibilidad',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    DisponibilidadListComponent
  ],
  template: `
    <div class="mi-disponibilidad-container">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <mat-icon class="page-icon">schedule</mat-icon>
            <div class="title-text">
              <h2 class="page-title">Mi Disponibilidad</h2>
              <p class="page-subtitle">Gestiona tus horarios disponibles para clases</p>
            </div>
          </div>
          <div class="header-actions" *ngIf="!loading && docente">
            <button
              mat-raised-button
              color="primary"
              (click)="openCreateDialog()"
              [disabled]="loading">
              <mat-icon>add</mat-icon>
              Agregar Disponibilidad
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p class="loading-text">Cargando tu información...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && error" class="error-container">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>Error al cargar la información</h3>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="loadData()">
          <mat-icon>refresh</mat-icon>
          Reintentar
        </button>
      </div>

      <!-- Teacher Info Card -->
      <mat-card *ngIf="!loading && !error && docente" class="teacher-info-card">
        <mat-card-header>
          <div class="teacher-avatar" [style.background]="getAvatarColor(docente.fullName)">
            <span class="avatar-initials">{{ getInitials(docente.fullName) }}</span>
          </div>
          <div class="teacher-details">
            <mat-card-title>{{ docente.fullName }}</mat-card-title>
            <mat-card-subtitle>{{ docente.email }}</mat-card-subtitle>
            <div class="teacher-meta">
              <mat-chip-set>
                <mat-chip>{{ docente.department.name }}</mat-chip>
                <mat-chip
                  *ngFor="let area of docente.knowledgeAreas"
                  class="knowledge-area-chip">
                  {{ area.name }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </div>
        </mat-card-header>
      </mat-card>

      <!-- Availability Management -->
      <div *ngIf="!loading && !error && docente" class="availability-section">
        <app-disponibilidad-list
          [docente]="docente"
          [usePersonalEndpoints]="true"
          (availabilityChange)="onAvailabilityChange($event)">
        </app-disponibilidad-list>
      </div>

      <!-- Not a Teacher State -->
      <div *ngIf="!loading && !error && !docente" class="not-teacher-container">
        <mat-icon class="info-icon">info</mat-icon>
        <h3>Acceso no disponible</h3>
        <p>Esta sección está disponible solo para usuarios con rol de docente.</p>
        <p>Tu rol actual es: <strong>{{ currentUserRole }}</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .mi-disponibilidad-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .page-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #3f51b5;
    }

    .title-text {
      flex-grow: 1;
    }

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 400;
      color: #333;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      font-size: 16px;
      color: #666;
      font-weight: 400;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .loading-container,
    .error-container,
    .not-teacher-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-text {
      margin-top: 16px;
      color: #666;
      font-size: 16px;
    }

    .error-icon,
    .info-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #f44336;
      margin-bottom: 16px;
    }

    .info-icon {
      color: #2196f3;
    }

    .teacher-info-card {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .teacher-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
    }

    .avatar-initials {
      color: white;
      font-size: 24px;
      font-weight: 500;
    }

    .teacher-details {
      flex-grow: 1;
    }

    .teacher-meta {
      margin-top: 12px;
    }

    .knowledge-area-chip {
      background-color: #e8f0fe;
      color: #1565c0;
    }

    .availability-section {
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .mi-disponibilidad-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .title-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .page-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .page-title {
        font-size: 24px;
      }

      .teacher-avatar {
        width: 56px;
        height: 56px;
      }

      .avatar-initials {
        font-size: 20px;
      }
    }
  `]
})
export class MiDisponibilidadComponent implements OnInit {
  docente: TeacherWithAvailabilitiesResponse | null = null;
  loading = false;
  error: string | null = null;
  currentUserRole: string = '';

  constructor(
    private meService: MeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRoleDisplayName();
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.meService.getCurrentUserProfile()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          const profile = response.data;

          if (profile.role === 'TEACHER' && profile.teacher) {
            this.docente = profile.teacher;
          } else {
            this.docente = null;
          }
        },
        error: (error) => {
          console.error('Error al cargar perfil:', error);

          if (error.status === 403) {
            this.error = 'No tienes permisos para acceder a esta información';
          } else {
            this.error = 'Error al cargar la información del perfil';
          }
        }
      });
  }

  openCreateDialog(): void {
    if (!this.docente) return;

    const dialogRef = this.dialog.open(DisponibilidadFormComponent, {
      width: '500px',
      data: {
        teacherUuid: this.docente.uuid,
        teacherName: this.docente.fullName,
        existingAvailabilities: this.docente.availabilities,
        usePersonalEndpoints: true // Flag para usar endpoints personales
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshAvailabilities();
      }
    });
  }

  onAvailabilityChange(availabilities: TeacherAvailabilityResponse[]): void {
    if (this.docente) {
      this.docente.availabilities = availabilities;
    }
  }

  private refreshAvailabilities(): void {
    if (!this.docente) return;

    this.meService.getCurrentTeacherAvailabilities()
      .subscribe({
        next: (response) => {
          if (this.docente) {
            this.docente.availabilities = response.data;
          }
        },
        error: (error) => {
          console.error('Error al actualizar disponibilidades:', error);
          this.showMessage('Error al actualizar las disponibilidades', 'error');
        }
      });
  }

  getInitials(fullName: string): string {
    if (!fullName) return '';

    const names = fullName.trim().split(' ');
    const initials = names
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);

    return initials;
  }

  getAvatarColor(fullName: string): string {
    if (!fullName) return 'linear-gradient(45deg, #3f51b5, #5c6bc0)';

    const colors = [
      'linear-gradient(45deg, #3f51b5, #5c6bc0)',
      'linear-gradient(45deg, #4caf50, #66bb6a)',
      'linear-gradient(45deg, #ff9800, #ffb74d)',
      'linear-gradient(45deg, #e91e63, #f06292)',
      'linear-gradient(45deg, #9c27b0, #ba68c8)',
      'linear-gradient(45deg, #00bcd4, #4dd0e1)'
    ];

    const index = fullName.charCodeAt(0) % colors.length;
    return colors[index];
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: `${type}-snackbar`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
