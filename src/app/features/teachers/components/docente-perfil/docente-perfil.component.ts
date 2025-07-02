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
import {TeacherAssignedClassesComponent} from '../teacher-assigned-classes/teacher-assigned-classes.component';

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
    DisponibilidadListComponent,
    TeacherAssignedClassesComponent
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

    // ✅ MEJORADO: Detectar tabs específicos desde query params
    this.handleTabSelection();
  }
  // ✅ NUEVO MÉTODO: Manejar selección de tab desde query params
  private handleTabSelection(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');

    switch (tab) {
      case 'disponibilidad':
        this.activeTab = 1;
        break;
      case 'clases':  // ✅ NUEVO
      case 'clases-asignadas':  // ✅ NUEVO - alias alternativo
        this.activeTab = 2;
        break;
      case 'general':
      default:
        this.activeTab = 0;
        break;
    }

    // ✅ Log para debugging
    if (tab) {
      console.log(`🎯 Navegando a tab: ${tab} (índice: ${this.activeTab})`);
    }
  }

  loadDocenteWithAvailabilities(uuid: string): void {
    this.loading = true;
    console.log('🔄 Cargando información completa del docente:', uuid);

    this.docenteService.getTeacherWithAvailabilities(uuid)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.docente = response.data;
          console.log('✅ Docente cargado exitosamente:', this.docente?.fullName);

          // ✅ NUEVO: Mostrar mensaje contextual si viene de clases asignadas
          this.showContextualMessage();
        },
        error: (error) => {
          console.error('❌ Error al cargar el docente:', error);
          this.showMessage('Error al cargar la información del docente', 'error');
          this.navigateBack();
        }
      });
  }
  private showContextualMessage(): void {
    const source = this.route.snapshot.queryParamMap.get('from');
    const tab = this.route.snapshot.queryParamMap.get('tab');

    if (source === 'schedule-management' && tab === 'clases') {
      this.showMessage(
        'Visualizando las clases asignadas del docente desde el módulo de horarios',
        'info'
      );
    } else if (source === 'conflict' && tab === 'clases') {
      this.showMessage(
        'Revisando clases del docente debido a un conflicto de horario detectado',
        'error'
      );
    }
  }

  onAvailabilityChange(availabilities: TeacherAvailabilityResponse[]): void {
    if (this.docente) {
      this.docente.availabilities = availabilities;
    }
  }

  navigateBack(): void {
    // ✅ MEJORADO: Preservar contexto de navegación si existe
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');

    if (returnTo === 'schedule-management') {
      this.router.navigate(['/dashboard/horarios']);
    } else {
      this.router.navigate(['/dashboard/docentes']);
    }
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
  switchToTab(tabIndex: number): void {
    this.activeTab = tabIndex;

    // Actualizar URL para reflejar el cambio
    const tabNames = ['general', 'disponibilidad', 'clases'];
    const currentParams = { ...this.route.snapshot.queryParams };

    if (tabIndex > 0) {
      currentParams['tab'] = tabNames[tabIndex];
    } else {
      delete currentParams['tab'];
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      replaceUrl: true
    });
  }

  // ✅ NUEVO MÉTODO: Obtener información del tab activo
  getActiveTabInfo(): { name: string; icon: string } {
    const tabs = [
      { name: 'Información General', icon: 'person' },
      { name: 'Disponibilidad', icon: 'schedule' },
      { name: 'Clases Asignadas', icon: 'event_note' }
    ];

    return tabs[this.activeTab] || tabs[0];
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
