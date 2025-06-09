// src/app/features/carreras/components/carrera-list/carrera-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { finalize } from 'rxjs/operators';

import {
  CareerResponse,
  EducationalModalityResponse,
  CareerFilter
} from '../../models/carrera.model';
import { CarreraService } from '../../services/carrera.service';
import { CarreraFormComponent } from '../carrera-form/carrera-form.component';

@Component({
  selector: 'app-carrera-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule
  ],
  templateUrl: `./carrera-list.html`,
  styleUrls: ['./carrera-list.component.scss']
})
export class CarreraListComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private carreraService = inject(CarreraService);

  carreras: CareerResponse[] = [];
  filteredCarreras: CareerResponse[] = [];
  modalidades: EducationalModalityResponse[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'modality', 'cycles', 'actions'];

  // Filtros
  selectedModalityFilter = '';
  searchTerm = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    Promise.all([
      this.carreraService.getAllCareers().toPromise(),
      this.carreraService.getAllModalidades().toPromise()
    ]).then(([carrerasResponse, modalidadesResponse]) => {
      this.carreras = carrerasResponse?.data || [];
      this.modalidades = modalidadesResponse?.data || [];
      this.applyFilters();
    }).catch(error => {
      console.error('Error al cargar datos:', error);
      this.showMessage('Error al cargar los datos', 'error');
    }).finally(() => {
      this.loading = false;
    });
  }

  applyFilters(): void {
    let filtered = [...this.carreras];

    // Filtro por modalidad
    if (this.selectedModalityFilter) {
      filtered = filtered.filter(carrera =>
        carrera.modality.uuid === this.selectedModalityFilter
      );
    }

    // Filtro por búsqueda de texto
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(carrera =>
        carrera.name.toLowerCase().includes(searchLower) ||
        carrera.modality.name.toLowerCase().includes(searchLower)
      );
    }

    this.filteredCarreras = filtered;
  }

  clearFilters(): void {
    this.selectedModalityFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return !!(this.selectedModalityFilter || (this.searchTerm && this.searchTerm.trim()));
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CarreraFormComponent, {
      width: '650px',
      maxWidth: '95vw',
      data: { isEdit: false },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'create') {
        this.createCarrera(result.data);
      }
    });
  }

  openEditDialog(carrera: CareerResponse): void {
    const dialogRef = this.dialog.open(CarreraFormComponent, {
      width: '650px',
      maxWidth: '95vw',
      data: {
        carrera: carrera,
        isEdit: true
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'update') {
        this.updateCarrera(result.uuid, result.data);
      }
    });
  }

  viewCycles(carrera: CareerResponse): void {
    const cyclesList = carrera.cycles
      .map(cycle => `Ciclo ${cycle.number}`)
      .join(', ');

    this.snackBar.open(
      `${carrera.name}: ${cyclesList}`,
      'Cerrar',
      {
        duration: 8000,
        panelClass: 'info-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );
  }

  createCarrera(carreraData: any): void {
    this.carreraService.createCareer(carreraData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Carrera creada exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear carrera:', error);
        this.showMessage('Error al crear la carrera', 'error');
      }
    });
  }

  updateCarrera(uuid: string, carreraData: any): void {
    this.carreraService.updateCareer(uuid, carreraData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Carrera actualizada exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al actualizar carrera:', error);
        this.showMessage('Error al actualizar la carrera', 'error');
      }
    });
  }

  confirmDelete(carrera: CareerResponse): void {
    const cyclesInfo = carrera.cycles.length > 0
      ? ` (Esto también eliminará sus ${carrera.cycles.length} ciclos asociados)`
      : '';

    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar la carrera "${carrera.name}"?${cyclesInfo}`
    );

    if (confirmed) {
      this.deleteCarrera(carrera.uuid);
    }
  }

  deleteCarrera(uuid: string): void {
    this.carreraService.deleteCareer(uuid).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Carrera eliminada exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al eliminar carrera:', error);
        this.showMessage('Error al eliminar la carrera', 'error');
      }
    });
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
