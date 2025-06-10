// src/app/features/periods/period-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Period, PeriodService } from '../services/period.service';
import { PeriodDialogComponent } from './period-dialog.component';

@Component({
  selector: 'app-period-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="container">
      <div class="header-container">
        <h1 class="page-title">Gestión de Periodos Académicos</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Nuevo Periodo
        </button>
      </div>

      <mat-card class="table-card">
        <mat-card-content>
          <div class="mat-elevation-z8 data-table-container">
            <table mat-table [dataSource]="periods" matSort>
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
                <td mat-cell *matCellDef="let row">{{row.name}}</td>
              </ng-container>

              <!-- Start Date Column -->
              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha de Inicio</th>
                <td mat-cell *matCellDef="let row">{{row.startDate | date}}</td>
              </ng-container>

              <!-- End Date Column -->
              <ng-container matColumnDef="endDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha de Fin</th>
                <td mat-cell *matCellDef="let row">{{row.endDate | date}}</td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  <span [class]="isCurrent(row) ? 'status-active' : 'status-inactive'">
                    {{isCurrent(row) ? 'Periodo Actual' : 'Inactivo'}}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button color="primary" (click)="openEditDialog(row)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(row)" matTooltip="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    [color]="isCurrent(row) ? 'accent' : 'primary'"
                    (click)="setAsCurrent(row)"
                    [disabled]="isCurrent(row)"
                    matTooltip="Establecer como periodo actual">
                    <mat-icon>check_circle</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns;"
                [class.current-period-row]="isCurrent(row)">
              </tr>
            </table>

            <mat-paginator [pageSizeOptions]="[5, 10, 25]" aria-label="Seleccionar página"></mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
    }

    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .table-card {
      margin-bottom: 24px;
    }

    .data-table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
    }

    .mat-column-actions {
      width: 150px;
      text-align: center;
    }

    .status-active {
      color: #4caf50;
      font-weight: 500;
    }

    .status-inactive {
      color: #9e9e9e;
    }

    .current-period-row {
      background: rgba(76, 175, 80, 0.1);
    }
  `]
})
export class PeriodListComponent implements OnInit {
  periods: Period[] = [];
  currentPeriod: Period | null = null;
  displayedColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'actions'];

  constructor(
    private periodService: PeriodService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPeriods();
    this.periodService.currentPeriod$.subscribe(period => {
      this.currentPeriod = period;
    });
  }

  loadPeriods(): void {
    this.periodService.getAllPeriods().subscribe({
      next: (response) => {
        this.periods = Array.isArray(response.data) ? response.data : [response.data];
      },
      error: (error) => {
        this.snackBar.open('Error al cargar periodos: ' + error.message, 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PeriodDialogComponent, {
      width: '500px',
      data: { isNew: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.periodService.createPeriod(result).subscribe({
          next: () => {
            this.snackBar.open('Periodo creado con éxito', 'Cerrar', { duration: 3000 });
            this.loadPeriods();
          },
          error: (error) => {
            this.snackBar.open('Error al crear el periodo: ' + error.message, 'Cerrar', { duration: 5000 });
          }
        });
      }
    });
  }

  openEditDialog(period: Period): void {
    const dialogRef = this.dialog.open(PeriodDialogComponent, {
      width: '500px',
      data: { isNew: false, period }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.periodService.updatePeriod(period.uuid, result).subscribe({
          next: () => {
            this.snackBar.open('Periodo actualizado con éxito', 'Cerrar', { duration: 3000 });
            this.loadPeriods();

            // Actualizar periodo actual si es necesario
            if (this.currentPeriod && this.currentPeriod.uuid === period.uuid) {
              const updatedPeriod = { ...period, ...result };
              this.periodService.setCurrentPeriod(updatedPeriod);
            }
          },
          error: (error) => {
            this.snackBar.open('Error al actualizar el periodo: ' + error.message, 'Cerrar', { duration: 5000 });
          }
        });
      }
    });
  }

  confirmDelete(period: Period): void {
    if (confirm(`¿Está seguro de eliminar el periodo "${period.name}"?`)) {
      this.periodService.deletePeriod(period.uuid).subscribe({
        next: () => {
          this.snackBar.open('Periodo eliminado con éxito', 'Cerrar', { duration: 3000 });
          this.loadPeriods();

          // Limpiar periodo actual si es el que se eliminó
          if (this.currentPeriod && this.currentPeriod.uuid === period.uuid) {
            this.periodService.clearCurrentPeriod();
          }
        },
        error: (error) => {
          this.snackBar.open('Error al eliminar el periodo: ' + error.message, 'Cerrar', { duration: 5000 });
        }
      });
    }
  }

  setAsCurrent(period: Period): void {
    this.periodService.setCurrentPeriod(period);
    this.snackBar.open(`Periodo ${period.name} establecido como actual`, 'Cerrar', { duration: 3000 });
  }

  isCurrent(period: Period): boolean {
    return this.currentPeriod !== null && this.currentPeriod.uuid === period.uuid;
  }
}
