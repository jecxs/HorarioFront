// src/app/features/docentes/components/docente-perfil/docente-perfil.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

import { TeacherWithAvailabilitiesResponse } from '../../models/docente.model';
import { TeacherAvailabilityResponse } from '../../models/disponibilidad.model';
import { DocenteService } from '../../services/docente.service';
import { DisponibilidadListComponent } from '../disponibilidad/disponibilidad-list.component';
import { DocenteCredencialesComponent } from '../docente-credenciales/docente-credenciales.component';

@Component({
  selector: 'app-docente-perfil',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DisponibilidadListComponent
  ],
  templateUrl: './docente-perfil.component.html',
  styleUrls: ['./docente-perfil.component.scss']
})
export class DocentePerfilComponent implements OnInit {
  docente: TeacherWithAvailabilitiesResponse | null = null;
  loading = false;
  docenteUuid: string | null = null;
  activeTab = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docenteService: DocenteService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.docenteUuid = this.route.snapshot.paramMap.get('id');
    if (this.docenteUuid) {
      this.loadDocenteWithAvailabilities(this.docenteUuid);
    } else {
      this.showMessage('ID de docente no proporcionado', 'error');
      this.navigateBack();
    }

    // Detectar si hay un parámetro para ir directamente a la pestaña de disponibilidad
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'disponibilidad') {
      this.activeTab = 1; // Índice de la pestaña de disponibilidad
    }
  }

  loadDocenteWithAvailabilities(uuid: string): void {
    this.loading = true;
    this.docenteService.getTeacherWithAvailabilities(uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.docente = response.data;
        },
        error: (error) => {
          console.error('Error al cargar el docente:', error);
          this.showMessage('Error al cargar la información del docente', 'error');
          this.navigateBack();
        }
      });
  }

  onAvailabilityChange(availabilities: TeacherAvailabilityResponse[]): void {
    if (this.docente) {
      this.docente.availabilities = availabilities;
    }
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard/docentes']);
  }

  editDocente(): void {
    if (this.docente) {
      this.router.navigate(['/dashboard/docentes/edit', this.docente.uuid]);
    }
  }

  viewCredentials(): void {
    if (this.docente && this.docente.hasUserAccount) {
      const dialogRef = this.docenteService.openCredentialsDialog(this.docente);
    }
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
