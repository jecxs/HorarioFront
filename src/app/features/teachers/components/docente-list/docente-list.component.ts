// src/app/features/docentes/components/docente-list/docente-list.component.ts
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  TeacherResponse,
  AcademicDepartmentResponse,
  KnowledgeAreaResponse,
  TeacherFilter
} from '../../models/docente.model';
import { DocenteService } from '../../services/docente.service';
import { DocenteFormComponent } from '../docente-form/docente-form.component';
import { DocenteCredencialesComponent } from '../docente-credenciales/docente-credenciales.component';
import {MatDivider} from '@angular/material/divider';

@Component({
  selector: 'app-docente-list',
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
    MatChipsModule,
    MatExpansionModule,
    MatBadgeModule,
    MatDivider
  ],
  templateUrl: './docente-list.component.html',
  styleUrls: ['./docente-list.component.scss']
})
export class DocenteListComponent implements OnInit {

  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private docenteService = inject(DocenteService);

  docentes: TeacherResponse[] = [];
  filteredDocentes: TeacherResponse[] = [];
  departamentos: AcademicDepartmentResponse[] = [];
  areasConocimiento: KnowledgeAreaResponse[] = [];
  loading = false;
  expandedDocente: string | null = null;

  displayedColumns: string[] = ['fullName', 'email', 'department', 'knowledgeAreas', 'hasUserAccount', 'actions'];

  // Filtros
  selectedDepartmentFilter = '';
  selectedKnowledgeAreaFilter: string[] = [];
  searchTerm = '';
  userAccountFilter: boolean | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    Promise.all([
      this.docenteService.getAllTeachers().toPromise(),
      this.docenteService.getAllDepartments().toPromise(),
      this.docenteService.getAllKnowledgeAreas().toPromise()
    ]).then(([docentesResponse, departamentosResponse, areasResponse]) => {
      this.docentes = docentesResponse?.data || [];
      this.departamentos = departamentosResponse?.data || [];
      this.areasConocimiento = areasResponse?.data || [];
      this.applyFilters();
    }).catch(error => {
      console.error('Error al cargar datos:', error);
      this.showMessage('Error al cargar los datos', 'error');
    }).finally(() => {
      this.loading = false;
    });
  }

  applyFilters(): void {
    let filtered = [...this.docentes];

    // Filtro por departamento
    if (this.selectedDepartmentFilter) {
      filtered = filtered.filter(docente =>
        docente.department.uuid === this.selectedDepartmentFilter
      );
    }

    // Filtro por área de conocimiento
    if (this.selectedKnowledgeAreaFilter && this.selectedKnowledgeAreaFilter.length > 0) {
      filtered = filtered.filter(docente =>
        docente.knowledgeAreas.some(area =>
          this.selectedKnowledgeAreaFilter.includes(area.uuid)
        )
      );
    }

    // Filtro por cuenta de usuario
    if (this.userAccountFilter !== null) {
      filtered = filtered.filter(docente =>
        docente.hasUserAccount === this.userAccountFilter
      );
    }

    // Filtro por búsqueda de texto
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(docente =>
        docente.fullName.toLowerCase().includes(searchLower) ||
        docente.email.toLowerCase().includes(searchLower) ||
        (docente.phone && docente.phone.toLowerCase().includes(searchLower))
      );
    }

    this.filteredDocentes = filtered;
  }

  clearFilters(): void {
    this.selectedDepartmentFilter = '';
    this.selectedKnowledgeAreaFilter = [];
    this.searchTerm = '';
    this.userAccountFilter = null;
    this.applyFilters();
  }

  hasFilters(): boolean {
    return !!(
      this.selectedDepartmentFilter ||
      this.selectedKnowledgeAreaFilter.length > 0 ||
      (this.searchTerm && this.searchTerm.trim()) ||
      this.userAccountFilter !== null
    );
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DocenteFormComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: {
        isEdit: false,
        departamentos: this.departamentos,
        areasConocimiento: this.areasConocimiento
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'create') {
        this.createDocente(result.data);
      }
    });
  }

  openEditDialog(docente: TeacherResponse): void {
    const dialogRef = this.dialog.open(DocenteFormComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: {
        docente: docente,
        isEdit: true,
        departamentos: this.departamentos,
        areasConocimiento: this.areasConocimiento
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'update') {
        this.updateDocente(result.uuid, result.data);
      }
    });
  }

  viewCredentials(docente: TeacherResponse): void {
    if (!docente.hasUserAccount) {
      this.showMessage('Este docente no tiene cuenta de usuario', 'info');
      return;
    }

    const dialogRef = this.dialog.open(DocenteCredencialesComponent, {
      width: '550px',
      data: { docente },
      disableClose: false
    });
  }

  toggleExpandRow(docenteUuid: string): void {
    this.expandedDocente = this.expandedDocente === docenteUuid ? null : docenteUuid;
  }

  createDocente(docenteData: any): void {
    this.docenteService.createTeacher(docenteData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Docente creado exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear docente:', error);
        this.showMessage('Error al crear el docente', 'error');
      }
    });
  }

  updateDocente(uuid: string, docenteData: any): void {
    this.docenteService.updateTeacher(uuid, docenteData).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Docente actualizado exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al actualizar docente:', error);
        this.showMessage('Error al actualizar el docente', 'error');
      }
    });
  }

  confirmDelete(docente: TeacherResponse): void {
    const message = docente.hasUserAccount
      ? `¿Estás seguro de que deseas eliminar al docente "${docente.fullName}"? Este docente tiene una cuenta de usuario activa.`
      : `¿Estás seguro de que deseas eliminar al docente "${docente.fullName}"?`;

    const confirmed = confirm(message);

    if (confirmed) {
      this.deleteDocente(docente.uuid);
    }
  }

  deleteDocente(uuid: string): void {
    this.docenteService.deleteTeacher(uuid).subscribe({
      next: (response) => {
        this.showMessage(response.message || 'Docente eliminado exitosamente', 'success');
        this.loadData();
      },
      error: (error) => {
        console.error('Error al eliminar docente:', error);
        this.showMessage('Error al eliminar el docente', 'error');
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

  viewDocenteProfile(docente: TeacherResponse): void {
    this.router.navigate(['/dashboard/docentes/view', docente.uuid]);
  }
  viewDocenteAvailability(docente: TeacherResponse): void {
    this.router.navigate(['/dashboard/docentes/view', docente.uuid], {
      queryParams: { tab: 'disponibilidad' }
    });
  }
}
