// src/app/shared/components/period-selector/period-selector.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PeriodService, Period } from '../../../features/periods/services/period.service';

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="period-selector-container">
      <div class="current-period-info" *ngIf="currentPeriod">
        <mat-icon class="period-icon">event</mat-icon>
        <div class="period-details">
          <span class="period-name">{{ currentPeriod.name }}</span>
          <span class="period-dates">
            {{ currentPeriod.startDate | date:'MMM yyyy' }} - {{ currentPeriod.endDate | date:'MMM yyyy' }}
          </span>
        </div>
      </div>

      <mat-form-field appearance="outline" class="period-select">
        <mat-label>Periodo Académico</mat-label>
        <mat-select
          [value]="currentPeriod?.uuid"
          (selectionChange)="onPeriodChange($event.value)">
          <mat-option value="">Seleccionar periodo...</mat-option>
          <mat-option *ngFor="let period of periods" [value]="period.uuid">
            <div class="option-content">
              <span class="option-main">{{ period.name }}</span>
              <span class="option-secondary">
                {{ period.startDate | date:'MMM yyyy' }} - {{ period.endDate | date:'MMM yyyy' }}
              </span>
            </div>
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .period-selector-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .current-period-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }

    .period-icon {
      color: #3b82f6;
    }

    .period-details {
      display: flex;
      flex-direction: column;
    }

    .period-name {
      font-weight: 500;
      color: #1e293b;
    }

    .period-dates {
      font-size: 12px;
      color: #64748b;
    }

    .period-select {
      min-width: 280px;
    }

    .option-content {
      display: flex;
      flex-direction: column;
    }

    .option-main {
      font-weight: 500;
    }

    .option-secondary {
      font-size: 12px;
      color: #64748b;
    }
  `]
})
export class PeriodSelectorComponent implements OnInit {
  private periodService = inject(PeriodService);
  private snackBar = inject(MatSnackBar);

  periods: Period[] = [];
  currentPeriod: Period | null = null;

  ngOnInit(): void {
    this.loadPeriods();
    this.periodService.currentPeriod$.subscribe(period => {
      this.currentPeriod = period;
    });
  }

  private loadPeriods(): void {
    this.periodService.getAllPeriods().subscribe({
      next: (response) => {
        this.periods = Array.isArray(response.data) ? response.data : [response.data];
      },
      error: (error) => {
        this.snackBar.open('Error al cargar periodos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onPeriodChange(periodUuid: string): void {
    if (!periodUuid) {
      this.periodService.clearCurrentPeriod();
      this.showPeriodChangeNotification('Periodo desactivado', 'warning');
      return;
    }

    const selectedPeriod = this.periods.find(p => p.uuid === periodUuid);
    if (selectedPeriod) {
      const previousPeriod = this.periodService.getCurrentPeriod();

      // ✅ Verificar si realmente cambió el periodo
      if (previousPeriod && previousPeriod.uuid === selectedPeriod.uuid) {
        return; // No hay cambio
      }

      this.periodService.setCurrentPeriod(selectedPeriod);

      // ✅ Mensaje diferente si es el primer periodo o un cambio
      if (previousPeriod) {
        this.showPeriodChangeNotification(
          `Periodo cambiado de "${previousPeriod.name}" a "${selectedPeriod.name}"`,
          'info'
        );
      } else {
        this.showPeriodChangeNotification(
          `Periodo "${selectedPeriod.name}" establecido como actual`,
          'success'
        );
      }
    }
  }
  // ✅ NUEVO: Método helper para notificaciones
  private showPeriodChangeNotification(message: string, type: 'success' | 'warning' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }
}
