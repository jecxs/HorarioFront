// src/app/features/learning-spaces/components/learning-spaces.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay, combineLatest, startWith } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// Services
import {
  LearningSpaceService,
  LearningSpace,
  TeachingType,
  LearningSpaceSpecialty
} from '../services/learning-space.service';

// Dialogs
import { LearningSpaceDialogComponent } from './learning-space-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

interface SpacesByType {
  type: TeachingType;
  spaces: LearningSpace[];
  totalSpaces: number;
  totalCapacity: number;
  averageCapacity: number;
}

@Component({
  selector: 'app-learning-spaces',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './learning-spaces.component.html',
  styleUrls: ['./learning-spaces.component.scss']
})
export class LearningSpacesComponent implements OnInit {
  private learningSpaceService = inject(LearningSpaceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  // Observables
  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(map(result => result.matches), shareReplay());

  // Data
  spacesByType: SpacesByType[] = [];
  filteredSpacesByType: SpacesByType[] = [];
  teachingTypes: TeachingType[] = [];
  specialties: LearningSpaceSpecialty[] = [];
  allSpaces: LearningSpace[] = [];

  // Filters
  selectedTypeFilter = new FormControl('');
  selectedSpecialtyFilter = new FormControl('');
  capacityFilter = new FormControl('');
  searchFilter = new FormControl('');

  // Stats
  totalSpaces = 0;
  totalCapacity = 0;
  theoreticalSpaces = 0;
  practicalSpaces = 0;

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  loadData(): void {
    combineLatest([
      this.learningSpaceService.getAllLearningSpaces(),
      this.learningSpaceService.getAllTeachingTypes(),
      this.learningSpaceService.getAllSpecialties()
    ]).subscribe({
      next: ([spacesResponse, typesResponse, specialtiesResponse]) => {
        this.allSpaces = Array.isArray(spacesResponse.data) ? spacesResponse.data : [spacesResponse.data];
        this.teachingTypes = Array.isArray(typesResponse.data) ? typesResponse.data : [typesResponse.data];
        this.specialties = Array.isArray(specialtiesResponse.data) ? specialtiesResponse.data : [specialtiesResponse.data];

        this.processSpacesData();
        this.updateStats();
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  processSpacesData(): void {
    // Agrupar espacios por tipo de enseñanza
    const groupedData = new Map<string, LearningSpace[]>();

    this.allSpaces.forEach(space => {
      const typeKey = space.teachingType.name;
      if (!groupedData.has(typeKey)) {
        groupedData.set(typeKey, []);
      }
      groupedData.get(typeKey)!.push(space);
    });

    // Convertir a array de SpacesByType
    this.spacesByType = Array.from(groupedData.entries()).map(([typeName, spaces]) => {
      const type = this.teachingTypes.find(t => t.name === typeName)!;
      const totalCapacity = spaces.reduce((sum, space) => sum + space.capacity, 0);

      return {
        type,
        spaces: spaces.sort((a, b) => a.name.localeCompare(b.name)),
        totalSpaces: spaces.length,
        totalCapacity,
        averageCapacity: Math.round(totalCapacity / spaces.length)
      };
    });

    // Ordenar: THEORY primero, luego PRACTICE
    this.spacesByType.sort((a, b) => {
      if (a.type.name === 'THEORY') return -1;
      if (b.type.name === 'THEORY') return 1;
      return 0;
    });

    this.applyFilters();
  }

  setupFilters(): void {
    combineLatest([
      this.selectedTypeFilter.valueChanges.pipe(startWith('')),
      this.selectedSpecialtyFilter.valueChanges.pipe(startWith('')),
      this.capacityFilter.valueChanges.pipe(startWith('')),
      this.searchFilter.valueChanges.pipe(startWith(''))
    ]).subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.spacesByType];

    // Filtro por tipo
    if (this.selectedTypeFilter.value) {
      filtered = filtered.filter(item => item.type.name === this.selectedTypeFilter.value);
    }

    // Filtro por búsqueda de texto
    if (this.searchFilter.value) {
      const searchTerm = this.searchFilter.value.toLowerCase();
      filtered = filtered.map(item => ({
        ...item,
        spaces: item.spaces.filter(space =>
          space.name.toLowerCase().includes(searchTerm) ||
          (space.specialty?.name.toLowerCase().includes(searchTerm))
        )
      })).filter(item => item.spaces.length > 0);
    }

    // Filtro por especialidad (solo para espacios prácticos)
    if (this.selectedSpecialtyFilter.value) {
      filtered = filtered.map(item => ({
        ...item,
        spaces: item.spaces.filter(space =>
          space.specialty?.uuid === this.selectedSpecialtyFilter.value
        )
      })).filter(item => item.spaces.length > 0);
    }

    // Filtro por capacidad mínima
    if (this.capacityFilter.value) {
      const minCapacity = parseInt(this.capacityFilter.value);
      filtered = filtered.map(item => ({
        ...item,
        spaces: item.spaces.filter(space => space.capacity >= minCapacity)
      })).filter(item => item.spaces.length > 0);
    }

    this.filteredSpacesByType = filtered;
  }

  updateStats(): void {
    this.totalSpaces = this.allSpaces.length;
    this.totalCapacity = this.allSpaces.reduce((sum, space) => sum + space.capacity, 0);
    this.theoreticalSpaces = this.allSpaces.filter(s => s.teachingType.name === 'THEORY').length;
    this.practicalSpaces = this.allSpaces.filter(s => s.teachingType.name === 'PRACTICE').length;
  }

  getTypeDisplayName(typeName: string): string {
    return typeName === 'THEORY' ? 'Teóricas' : 'Prácticas';
  }

  getTypeIcon(typeName: string): string {
    return typeName === 'THEORY' ? 'menu_book' : 'science';
  }

  getTypeColor(typeName: string): string {
    return typeName === 'THEORY' ? 'primary' : 'accent';
  }

  openCreateSpaceDialog(): void {
    const dialogRef = this.dialog.open(LearningSpaceDialogComponent, {
      width: '600px',
      data: {
        isNew: true,
        teachingTypes: this.teachingTypes,
        specialties: this.specialties
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createSpace(result);
      }
    });
  }

  openEditSpaceDialog(space: LearningSpace): void {
    const dialogRef = this.dialog.open(LearningSpaceDialogComponent, {
      width: '600px',
      data: {
        isNew: false,
        space,
        teachingTypes: this.teachingTypes,
        specialties: this.specialties
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateSpace(space.uuid, result);
      }
    });
  }

  openBatchCreateDialog(): void {
    // Importar dinámicamente el componente
    import('./batch-learning-space-dialog.component').then(module => {
      const dialogRef = this.dialog.open(module.BatchLearningSpaceDialogComponent, {
        width: '800px',
        maxWidth: '90vw',
        data: {
          teachingTypes: this.teachingTypes,
          specialties: this.specialties
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.createSpacesBatch(result);
        }
      });
    }).catch(error => {
      console.error('Error al cargar el diálogo de creación por lotes:', error);
      this.snackBar.open('Error al cargar el diálogo', 'Cerrar', { duration: 3000 });
    });
  }

  openCreateSpecialtyDialog(): void {
    // Importar dinámicamente el componente
    import('./specialty-dialog.component').then(module => {
      const dialogRef = this.dialog.open(module.SpecialtyDialogComponent, {
        width: '500px',
        data: { isNew: true }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.createSpecialty(result);
        }
      });
    }).catch(error => {
      console.error('Error al cargar el diálogo de especialidades:', error);
      this.snackBar.open('Error al cargar el diálogo', 'Cerrar', { duration: 3000 });
    });
  }

  createSpace(spaceData: any): void {
    this.learningSpaceService.createLearningSpace(spaceData).subscribe({
      next: (response) => {
        this.snackBar.open('Ambiente creado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear ambiente:', error);
        this.snackBar.open(
          error.error?.error || 'Error al crear el ambiente',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  updateSpace(uuid: string, spaceData: any): void {
    this.learningSpaceService.updateLearningSpace(uuid, spaceData).subscribe({
      next: (response) => {
        this.snackBar.open('Ambiente actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al actualizar ambiente:', error);
        this.snackBar.open(
          error.error?.error || 'Error al actualizar el ambiente',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  createSpecialty(specialtyData: any): void {
    this.learningSpaceService.createSpecialty(specialtyData).subscribe({
      next: (response) => {
        this.snackBar.open('Especialidad creada exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData(); // Recargar para actualizar la lista de especialidades
      },
      error: (error) => {
        console.error('Error al crear especialidad:', error);
        this.snackBar.open(
          error.error?.error || 'Error al crear la especialidad',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  createSpacesBatch(batchData: any): void {
    // Generar array de espacios a crear
    const spacesToCreate = [];

    for (let i = batchData.startNumber; i <= batchData.endNumber; i++) {
      const spaceData = {
        name: `${batchData.prefix}${i}`,
        capacity: batchData.capacity,
        typeUUID: batchData.typeUUID,
        specialtyUuid: batchData.specialtyUuid || undefined
      };
      spacesToCreate.push(spaceData);
    }

    // Mostrar progreso
    const totalSpaces = spacesToCreate.length;
    let createdCount = 0;
    let failedCount = 0;

    this.snackBar.open(
      `Creando ${totalSpaces} ambientes...`,
      'Cerrar',
      { duration: 2000 }
    );

    // Crear espacios secuencialmente para evitar sobrecargar el servidor
    this.createSpacesSequentially(spacesToCreate, 0, createdCount, failedCount, totalSpaces);
  }

  private createSpacesSequentially(
    spaces: any[],
    index: number,
    createdCount: number,
    failedCount: number,
    totalSpaces: number
  ): void {
    if (index >= spaces.length) {
      // Terminó de crear todos los espacios
      this.showBatchResult(createdCount, failedCount, totalSpaces);
      this.loadData(); // Recargar datos
      return;
    }

    const spaceData = spaces[index];

    this.learningSpaceService.createLearningSpace(spaceData).subscribe({
      next: (response) => {
        createdCount++;
        // Continuar con el siguiente
        this.createSpacesSequentially(spaces, index + 1, createdCount, failedCount, totalSpaces);
      },
      error: (error) => {
        console.error(`Error al crear ambiente ${spaceData.name}:`, error);
        failedCount++;
        // Continuar con el siguiente aunque este haya fallado
        this.createSpacesSequentially(spaces, index + 1, createdCount, failedCount, totalSpaces);
      }
    });
  }

  private showBatchResult(createdCount: number, failedCount: number, totalSpaces: number): void {
    let message = '';
    let duration = 5000;

    if (failedCount === 0) {
      message = `✅ Se crearon exitosamente ${createdCount} ambientes`;
    } else if (createdCount === 0) {
      message = `❌ No se pudo crear ningún ambiente (${failedCount} errores)`;
      duration = 7000;
    } else {
      message = `⚠️ Se crearon ${createdCount} ambientes. ${failedCount} fallaron.`;
      duration = 7000;
    }

    this.snackBar.open(message, 'Cerrar', { duration });
  }

  confirmDeleteSpace(space: LearningSpace): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar el ambiente "${space.name}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteSpace(space);
      }
    });
  }

  deleteSpace(space: LearningSpace): void {
    this.learningSpaceService.deleteLearningSpace(space.uuid).subscribe({
      next: () => {
        this.snackBar.open('Ambiente eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al eliminar ambiente:', error);
        this.snackBar.open(
          error.error?.error || 'Error al eliminar el ambiente',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  clearFilters(): void {
    this.selectedTypeFilter.reset();
    this.selectedSpecialtyFilter.reset();
    this.capacityFilter.reset();
    this.searchFilter.reset();
  }

  getCapacityRangeColor(capacity: number): string {
    if (capacity <= 20) return 'accent';
    if (capacity <= 40) return 'primary';
    return 'warn';
  }

  getCapacityRangeText(capacity: number): string {
    if (capacity <= 20) return 'Pequeño';
    if (capacity <= 40) return 'Mediano';
    return 'Grande';
  }
}
