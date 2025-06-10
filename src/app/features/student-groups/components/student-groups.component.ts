// src/app/features/student-groups/components/student-groups.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay, combineLatest, startWith } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// Services
import { StudentGroupService, StudentGroup, Career } from '../services/student-group.service';
import { PeriodService, Period } from '../../periods/services/period.service';

// Dialogs
import { StudentGroupDialogComponent } from './student-group-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

interface GroupsByCareer {
  career: Career;
  groups: StudentGroup[];
  totalGroups: number;
}

@Component({
  selector: 'app-student-groups',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './student-groups.component.html',
  styleUrls: ['./student-groups.component.scss']
})
export class StudentGroupsComponent implements OnInit {
  private studentGroupService = inject(StudentGroupService);
  private periodService = inject(PeriodService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  // Observables
  currentPeriod$ = this.periodService.currentPeriod$;
  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(map(result => result.matches), shareReplay());

  // Data
  groupsByCareer: GroupsByCareer[] = [];
  filteredGroupsByCareer: GroupsByCareer[] = [];
  careers: Career[] = [];
  currentPeriod: Period | null = null;

  // Filters
  selectedCareerFilter = new FormControl('');
  selectedCycleFilter = new FormControl('');
  searchFilter = new FormControl('');

  // Stats
  totalGroups = 0;
  groupsInCurrentPeriod = 0;

  // Table configuration
  displayedColumns: string[] = ['name', 'cycle', 'career', 'period', 'actions'];

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();

    // Suscribirse al periodo actual
    this.currentPeriod$.subscribe(period => {
      this.currentPeriod = period;
    });
  }

  loadData(): void {
    combineLatest([
      this.studentGroupService.getAllGroups(),
      this.studentGroupService.getAllCareers()
    ]).subscribe({
      next: ([groupsResponse, careersResponse]) => {
        const groups = Array.isArray(groupsResponse.data) ? groupsResponse.data : [groupsResponse.data];
        this.careers = Array.isArray(careersResponse.data) ? careersResponse.data : [careersResponse.data];

        this.processGroupsData(groups);
        this.updateStats(groups);
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  processGroupsData(groups: StudentGroup[]): void {
    // Agrupar por carrera
    const groupedData = new Map<string, StudentGroup[]>();

    groups.forEach(group => {
      // Encontrar la carrera del grupo basándose en el ciclo
      const career = this.careers.find(c =>
        c.cycles.some(cycle => cycle.uuid === group.cycleUuid)
      );

      if (career) {
        const careerKey = career.uuid;
        if (!groupedData.has(careerKey)) {
          groupedData.set(careerKey, []);
        }
        groupedData.get(careerKey)!.push(group);
      }
    });

    // Convertir a array de GroupsByCareer
    this.groupsByCareer = Array.from(groupedData.entries()).map(([careerUuid, groups]) => {
      const career = this.careers.find(c => c.uuid === careerUuid)!;
      return {
        career,
        groups: groups.sort((a, b) => {
          // Ordenar por ciclo y luego por nombre
          if (a.cycleNumber !== b.cycleNumber) {
            return a.cycleNumber - b.cycleNumber;
          }
          return a.name.localeCompare(b.name);
        }),
        totalGroups: groups.length
      };
    });

    // Ordenar carreras por nombre
    this.groupsByCareer.sort((a, b) => a.career.name.localeCompare(b.career.name));

    this.applyFilters();
  }

  setupFilters(): void {
    combineLatest([
      this.selectedCareerFilter.valueChanges.pipe(startWith('')),
      this.selectedCycleFilter.valueChanges.pipe(startWith('')),
      this.searchFilter.valueChanges.pipe(startWith(''))
    ]).subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.groupsByCareer];

    // Filtro por carrera
    if (this.selectedCareerFilter.value) {
      filtered = filtered.filter(item => item.career.uuid === this.selectedCareerFilter.value);
    }

    // Filtro por búsqueda de texto
    if (this.searchFilter.value) {
      const searchTerm = this.searchFilter.value.toLowerCase();
      filtered = filtered.map(item => ({
        ...item,
        groups: item.groups.filter(group =>
          group.name.toLowerCase().includes(searchTerm) ||
          group.cycleNumber.toString().includes(searchTerm)
        )
      })).filter(item => item.groups.length > 0);
    }

    // Filtro por ciclo
    if (this.selectedCycleFilter.value) {
      const cycleNumber = parseInt(this.selectedCycleFilter.value);
      filtered = filtered.map(item => ({
        ...item,
        groups: item.groups.filter(group => group.cycleNumber === cycleNumber)
      })).filter(item => item.groups.length > 0);
    }

    this.filteredGroupsByCareer = filtered;
  }

  updateStats(groups: StudentGroup[]): void {
    this.totalGroups = groups.length;
    this.groupsInCurrentPeriod = this.currentPeriod
      ? groups.filter(g => g.periodUuid === this.currentPeriod!.uuid).length
      : 0;
  }

  getAvailableCycles(): number[] {
    const cycles = new Set<number>();
    this.groupsByCareer.forEach(item => {
      item.groups.forEach(group => cycles.add(group.cycleNumber));
    });
    return Array.from(cycles).sort((a, b) => a - b);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(StudentGroupDialogComponent, {
      width: '500px',
      data: {
        isNew: true,
        careers: this.careers,
        currentPeriod: this.currentPeriod
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createGroup(result);
      }
    });
  }

  openEditDialog(group: StudentGroup): void {
    const dialogRef = this.dialog.open(StudentGroupDialogComponent, {
      width: '500px',
      data: {
        isNew: false,
        group,
        careers: this.careers,
        currentPeriod: this.currentPeriod
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateGroup(group.uuid, result);
      }
    });
  }

  createGroup(groupData: any): void {
    this.studentGroupService.createGroup(groupData).subscribe({
      next: (response) => {
        this.snackBar.open('Grupo creado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear grupo:', error);
        this.snackBar.open(
          error.error?.error || 'Error al crear el grupo',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  updateGroup(uuid: string, groupData: any): void {
    this.studentGroupService.updateGroup(uuid, groupData).subscribe({
      next: (response) => {
        this.snackBar.open('Grupo actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al actualizar grupo:', error);
        this.snackBar.open(
          error.error?.error || 'Error al actualizar el grupo',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  confirmDelete(group: StudentGroup): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar el grupo "${group.name}" del ciclo ${group.cycleNumber}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteGroup(group);
      }
    });
  }

  deleteGroup(group: StudentGroup): void {
    this.studentGroupService.deleteGroup(group.uuid).subscribe({
      next: () => {
        this.snackBar.open('Grupo eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al eliminar grupo:', error);
        this.snackBar.open(
          error.error?.error || 'Error al eliminar el grupo',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  clearFilters(): void {
    this.selectedCareerFilter.reset();
    this.selectedCycleFilter.reset();
    this.searchFilter.reset();
  }

  isCurrentPeriodGroup(group: StudentGroup): boolean {
    return this.currentPeriod ? group.periodUuid === this.currentPeriod.uuid : false;
  }
}
