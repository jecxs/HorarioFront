// src/app/features/modalidades/components/modalidad-list/modalidad-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

import { EducationalModalityResponse } from '../../models/modalidad.model';
import { ModalidadService } from '../../services/modalidad.service';
import { ModalidadFormComponent } from '../modalidad-form/modalidad-form.component';

@Component({
  selector: 'app-modalidad-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="modalidad-list-container">
      <!-- Header -->
      <div class="list-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>school</mat-icon>
            Modalidades Educativas
          </h1>
          <p class="page-subtitle">
            Gestiona los tipos de modalidades educativas de la institución
          </p>
        </div>
        <button
          mat-raised-button
          color="primary"
          (click)="openCreateDialog()"
          class="add-btn">
          <mat-icon>add</mat-icon>
          Nueva Modalidad
        </button>
      </div>

      <!-- Contenido principal -->
      <mat-card class="content-card">
        <!-- Loading spinner -->
        <div *ngIf="loading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Cargando modalidades...</p>
        </div>

        <!-- Lista de modalidades -->
        <div *ngIf="!loading" class="modalidades-content">
          <!-- Tabla para pantallas grandes -->
          <div class="table-container" [class.hidden-mobile]="true">
            <table mat-table [dataSource]="modalidades" class="modalidades-table">
              <!-- Columna Nombre -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef class="header-cell">
                  <mat-icon>school</mat-icon>
                  Modalidad
                </th>
                <td mat-cell *matCellDef="let modalidad" class="name-cell">
                  <div class="name-content">
                    <span class="name-text">{{ modalidad.name }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Columna Duración -->
              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef class="header-cell">
                  <mat-icon>schedule</mat-icon>
                  Duración
                </th>
                <td mat-cell *matCellDef="let modalidad" class="duration-cell">
                  <span class="duration-badge">
                    {{ modalidad.durationYears }} {{ modalidad.durationYears === 1 ? 'año' : 'años' }}
                  </span>
                </td>
              </ng-container>

              <!-- Columna Descripción -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef class="header-cell">
                  <mat-icon>description</mat-icon>
                  Descripción
                </th>
                <td mat-cell *matCellDef="let modalidad" class="description-cell">
                  <span class="description-text" [matTooltip]="modalidad.description || 'Sin descripción'">
                    {{ modalidad.description || 'Sin descripción' }}
                  </span>
                </td>
              </ng-container>

              <!-- Columna Acciones -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="header-cell actions-header">
                  <mat-icon>settings</mat-icon>
                  Acciones
                </th>
                <td mat-cell *matCellDef="let modalidad" class="actions-cell">
                  <div class="action-buttons">
                    <button
                      mat-icon-button
                      color="primary"
                      (click)="openEditDialog(modalidad)"
                      matTooltip="Editar modalidad">
                      <mat-icon>edit</mat-icon>
                    </button>

                    <button
                      mat-icon-button
                      color="warn"
                      (click)="confirmDelete(modalidad)"
                      matTooltip="Eliminar modalidad">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
            </table>

            <!-- Empty state -->
            <div *ngIf="modalidades.length === 0" class="empty-state">
              <mat-icon class="empty-icon">school</mat-icon>
              <h3>No hay modalidades registradas</h3>
              <p>Comienza creando tu primera modalidad educativa</p>
              <button mat-raised-button color="primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Crear Primera Modalidad
              </button>
            </div>
          </div>

          <!-- Cards para móviles -->
          <div class="mobile-cards">
            <div *ngFor="let modalidad of modalidades" class="mobile-card">
              <mat-card class="modalidad-card">
                <mat-card-header>
                  <div class="card-header-content">
                    <mat-icon class="card-icon">school</mat-icon>
                    <div class="card-title-section">
                      <h3>{{ modalidad.name }}</h3>
                      <span class="duration-badge mobile">
                        {{ modalidad.durationYears }} {{ modalidad.durationYears === 1 ? 'año' : 'años' }}
                      </span>
                    </div>
                  </div>
                </mat-card-header>

                <mat-card-content>
                  <p class="card-description">
                    {{ modalidad.description || 'Sin descripción' }}
                  </p>
                </mat-card-content>

                <mat-card-actions class="card-actions">
                  <button
                    mat-button
                    color="primary"
                    (click)="openEditDialog(modalidad)">
                    <mat-icon>edit</mat-icon>
                    Editar
                  </button>

                  <button
                    mat-button
                    color="warn"
                    (click)="confirmDelete(modalidad)">
                    <mat-icon>delete</mat-icon>
                    Eliminar
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <!-- Empty state móvil -->
            <div *ngIf="modalidades.length === 0" class="empty-state mobile">
              <mat-icon class="empty-icon">school</mat-icon>
              <h3>No hay modalidades</h3>
              <p>Crea tu primera modalidad educativa</p>
              <button mat-raised-button color="primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Nueva Modalidad
              </button>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styleUrls: ['./modalidad-list.component.scss']
})
export class ModalidadListComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private modalidadService = inject(ModalidadService);

  modalidades: EducationalModalityResponse[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'duration', 'description', 'actions'];

  ngOnInit(): void {
    this.loadModalidades();
  }

  loadModalidades(): void {
    this.loading = true;
    this.modalidadService.getAllModalidades()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.modalidades = response.data;
        },
        error: (error) => {
          console.error('Error al cargar modalidades:', error);
          this.showMessage('Error al cargar las modalidades', 'error');
        }
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ModalidadFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { isEdit: false },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'create') {
        this.createModalidad(result.data);
      }
    });
  }

  openEditDialog(modalidad: EducationalModalityResponse): void {
    const dialogRef = this.dialog.open(ModalidadFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        modalidad: modalidad,
        isEdit: true
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'update') {
        this.updateModalidad(result.uuid, result.data);
      }
    });
  }

  createModalidad(modalidadData: any): void {
    this.modalidadService.createModalidad(modalidadData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Modalidad creada exitosamente', 'success');
        this.loadModalidades();
      },
      error: (error) => {
        console.error('Error al crear modalidad:', error);
        this.showMessage('Error al crear la modalidad', 'error');
      }
    });
  }

  updateModalidad(uuid: string, modalidadData: any): void {
    this.modalidadService.updateModalidad(uuid, modalidadData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Modalidad actualizada exitosamente', 'success');
        this.loadModalidades();
      },
      error: (error) => {
        console.error('Error al actualizar modalidad:', error);
        this.showMessage('Error al actualizar la modalidad', 'error');
      }
    });
  }

  confirmDelete(modalidad: EducationalModalityResponse): void {
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar la modalidad "${modalidad.name}"?`);

    if (confirmed) {
      this.deleteModalidad(modalidad.uuid);
    }
  }

  deleteModalidad(uuid: string): void {
    this.modalidadService.deleteModalidad(uuid).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Modalidad eliminada exitosamente', 'success');
        this.loadModalidades();
      },
      error: (error) => {
        console.error('Error al eliminar modalidad:', error);
        this.showMessage('Error al eliminar la modalidad', 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar',
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
