// src/app/features/courses/components/courses.component.ts
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
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// Services
import {
  CourseService,
  Course,
  CourseFilters,
  EducationalModality,
  Career,
  KnowledgeArea
} from '../services/course.service';

// Dialogs
import { CourseDialogComponent } from './course-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

interface CoursesGrouped {
  modality: EducationalModality;
  careers: CareerWithCourses[];
  totalCourses: number;
}

interface CareerWithCourses {
  career: Career;
  cycles: CycleWithCourses[];
  totalCourses: number;
  totalTheoryHours: number;
  totalPracticeHours: number;
}

interface CycleWithCourses {
  cycleNumber: number;
  cycleUuid: string;
  courses: Course[];
  totalCourses: number;
  totalTheoryHours: number;
  totalPracticeHours: number;
}

@Component({
  selector: 'app-courses',
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
    MatTabsModule,
    MatExpansionModule
  ],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  private courseService = inject(CourseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);

  // Observables
  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(map(result => result.matches), shareReplay());

  // Data
  coursesGrouped: CoursesGrouped[] = [];
  allCourses: Course[] = [];
  modalities: EducationalModality[] = [];
  careers: Career[] = [];
  knowledgeAreas: KnowledgeArea[] = [];

  // Filters
  modalityFilter = new FormControl('');
  careerFilter = new FormControl('');
  cycleFilter = new FormControl('');
  knowledgeAreaFilter = new FormControl('');
  searchFilter = new FormControl('');
  typeFilter = new FormControl(''); // THEORY, PRACTICE, MIXED

  // State
  loading = false;
  expandedPanels = new Set<string>();

  // Stats
  totalCourses = 0;
  totalTheoryHours = 0;
  totalPracticeHours = 0;
  theoryCourses = 0;
  practiceCourses = 0;
  mixedCourses = 0;

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  loadData(): void {
    this.loading = true;

    combineLatest([
      this.courseService.getAllCourses(),
      this.courseService.getAllModalities(),
      this.courseService.getAllCareers(),
      this.courseService.getAllKnowledgeAreas()
    ]).subscribe({
      next: ([coursesResponse, modalitiesResponse, careersResponse, areasResponse]) => {
        console.log('📥 Respuestas recibidas:');
        console.log('- Cursos:', coursesResponse);
        console.log('- Modalidades:', modalitiesResponse);
        console.log('- Carreras:', careersResponse);
        console.log('- Áreas:', areasResponse);

        this.allCourses = Array.isArray(coursesResponse.data) ? coursesResponse.data : [coursesResponse.data];
        this.modalities = Array.isArray(modalitiesResponse.data) ? modalitiesResponse.data : [modalitiesResponse.data];
        this.careers = Array.isArray(careersResponse.data) ? careersResponse.data : [careersResponse.data];
        this.knowledgeAreas = Array.isArray(areasResponse.data) ? areasResponse.data : [areasResponse.data];

        // ✅ Verificar que las carreras incluyan ciclos
        console.log('🔍 Verificando ciclos en carreras:');
        this.careers.forEach(career => {
          console.log(`📚 "${career.name}": ${career.cycles?.length || 0} ciclos`, career.cycles);
        });

        this.processCoursesData();
        this.updateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar datos:', error);
        this.snackBar.open('Error al cargar los cursos', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  setupFilters(): void {
    combineLatest([
      this.modalityFilter.valueChanges.pipe(startWith('')),
      this.careerFilter.valueChanges.pipe(startWith('')),
      this.cycleFilter.valueChanges.pipe(startWith('')),
      this.knowledgeAreaFilter.valueChanges.pipe(startWith('')),
      this.searchFilter.valueChanges.pipe(startWith('')),
      this.typeFilter.valueChanges.pipe(startWith(''))
    ]).subscribe(() => {
      this.applyFilters();
    });
  }

  processCoursesData(): void {
    // Agrupar cursos por modalidad -> carrera -> ciclo
    const modalityMap = new Map<string, CoursesGrouped>();

    this.allCourses.forEach(course => {
      const modalityId = course.modality.uuid;
      const careerId = course.career.uuid;
      const cycleNumber = course.cycle.number;

      // Obtener o crear grupo de modalidad
      if (!modalityMap.has(modalityId)) {
        modalityMap.set(modalityId, {
          modality: course.modality,
          careers: [],
          totalCourses: 0
        });
      }

      const modalityGroup = modalityMap.get(modalityId)!;

      // Obtener o crear grupo de carrera
      let careerGroup = modalityGroup.careers.find(c => c.career.uuid === careerId);
      if (!careerGroup) {
        careerGroup = {
          career: course.career,
          cycles: [],
          totalCourses: 0,
          totalTheoryHours: 0,
          totalPracticeHours: 0
        };
        modalityGroup.careers.push(careerGroup);
      }

      // Obtener o crear grupo de ciclo
      let cycleGroup = careerGroup.cycles.find(c => c.cycleNumber === cycleNumber);
      if (!cycleGroup) {
        cycleGroup = {
          cycleNumber: cycleNumber,
          cycleUuid: course.cycle.uuid,
          courses: [],
          totalCourses: 0,
          totalTheoryHours: 0,
          totalPracticeHours: 0
        };
        careerGroup.cycles.push(cycleGroup);
      }

      // Agregar curso al ciclo
      cycleGroup.courses.push(course);
      cycleGroup.totalCourses++;
      cycleGroup.totalTheoryHours += course.weeklyTheoryHours;
      cycleGroup.totalPracticeHours += course.weeklyPracticeHours;

      // Actualizar totales de carrera
      careerGroup.totalCourses++;
      careerGroup.totalTheoryHours += course.weeklyTheoryHours;
      careerGroup.totalPracticeHours += course.weeklyPracticeHours;

      // Actualizar totales de modalidad
      modalityGroup.totalCourses++;
    });

    // Ordenar ciclos dentro de cada carrera
    modalityMap.forEach(modalityGroup => {
      modalityGroup.careers.forEach(careerGroup => {
        careerGroup.cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);

        // Ordenar cursos dentro de cada ciclo
        careerGroup.cycles.forEach(cycleGroup => {
          cycleGroup.courses.sort((a, b) => a.name.localeCompare(b.name));
        });
      });

      // Ordenar carreras por nombre
      modalityGroup.careers.sort((a, b) => a.career.name.localeCompare(b.career.name));
    });

    this.coursesGrouped = Array.from(modalityMap.values());
    this.coursesGrouped.sort((a, b) => a.modality.name.localeCompare(b.modality.name));
  }

  applyFilters(): void {
    const filters: CourseFilters = {};

    if (this.modalityFilter.value) filters.modalityUuid = this.modalityFilter.value;
    if (this.careerFilter.value) filters.careerUuid = this.careerFilter.value;
    if (this.knowledgeAreaFilter.value) filters.knowledgeAreaUuid = this.knowledgeAreaFilter.value;
    if (this.searchFilter.value) filters.courseName = this.searchFilter.value;

    // Si hay filtros, usar el endpoint de filtrado
    if (Object.keys(filters).length > 0) {
      this.courseService.filterCourses(filters).subscribe({
        next: (response) => {
          let filteredCourses = Array.isArray(response.data) ? response.data : [response.data];

          // Aplicar filtro de tipo si está seleccionado
          if (this.typeFilter.value) {
            filteredCourses = this.filterByType(filteredCourses, this.typeFilter.value);
          }

          this.allCourses = filteredCourses;
          this.processCoursesData();
          this.updateStats();
        },
        error: (error) => {
          console.error('Error al filtrar cursos:', error);
          this.snackBar.open('Error al filtrar cursos', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      // Sin filtros, usar todos los cursos pero aplicar filtro de tipo si está seleccionado
      this.loadData();
    }
  }

  private filterByType(courses: Course[], type: string): Course[] {
    return courses.filter(course => {
      const courseType = this.courseService.getCourseType(
        course.weeklyTheoryHours,
        course.weeklyPracticeHours
      );
      return courseType === type;
    });
  }

  updateStats(): void {
    this.totalCourses = this.allCourses.length;
    this.totalTheoryHours = this.allCourses.reduce((sum, course) => sum + course.weeklyTheoryHours, 0);
    this.totalPracticeHours = this.allCourses.reduce((sum, course) => sum + course.weeklyPracticeHours, 0);

    this.theoryCourses = this.allCourses.filter(c =>
      c.weeklyTheoryHours > 0 && c.weeklyPracticeHours === 0
    ).length;

    this.practiceCourses = this.allCourses.filter(c =>
      c.weeklyTheoryHours === 0 && c.weeklyPracticeHours > 0
    ).length;

    this.mixedCourses = this.allCourses.filter(c =>
      c.weeklyTheoryHours > 0 && c.weeklyPracticeHours > 0
    ).length;
  }

  // UI Methods
  getCourseTypeIcon(course: Course): string {
    return this.courseService.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours) === 'MIXED' ? 'hub' :
      course.weeklyTheoryHours > 0 ? 'menu_book' : 'science';
  }

  getCourseTypeText(course: Course): string {
    const type = this.courseService.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours);
    return type === 'MIXED' ? 'Mixto' :
      type === 'THEORY' ? 'Teórico' :
        type === 'PRACTICE' ? 'Práctico' : 'Sin definir';
  }

  getCourseTypeColor(course: Course): string {
    const type = this.courseService.getCourseType(course.weeklyTheoryHours, course.weeklyPracticeHours);
    return type === 'MIXED' ? 'accent' :
      type === 'THEORY' ? 'primary' :
        type === 'PRACTICE' ? 'warn' : '';
  }

  getTotalHours(course: Course): number {
    return course.weeklyTheoryHours + course.weeklyPracticeHours;
  }

  getFilteredCareers(): Career[] {
    if (!this.modalityFilter.value) return this.careers;
    return this.careers.filter(career => career.modality.uuid === this.modalityFilter.value);
  }

  getAvailableCycles(): number[] {
    const cycles = new Set<number>();
    this.allCourses.forEach(course => cycles.add(course.cycle.number));
    return Array.from(cycles).sort((a, b) => a - b);
  }

  togglePanel(panelId: string): void {
    if (this.expandedPanels.has(panelId)) {
      this.expandedPanels.delete(panelId);
    } else {
      this.expandedPanels.add(panelId);
    }
  }

  isPanelExpanded(panelId: string): boolean {
    return this.expandedPanels.has(panelId);
  }

  // Dialog Methods
  openCreateCourseDialog(): void {
    const dialogRef = this.dialog.open(CourseDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { isNew: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createCourse(result);
      }
    });
  }

  openEditCourseDialog(course: Course): void {
    const dialogRef = this.dialog.open(CourseDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        isNew: false,
        course
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateCourse(course.uuid, result);
      }
    });
  }

  confirmDeleteCourse(course: Course): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar el curso "${course.name}" (${course.code})?`,
        warningMessage: 'Esta acción no se puede deshacer y puede afectar las asignaciones de horarios existentes.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteCourse(course);
      }
    });
  }

  // CRUD Methods
  createCourse(courseData: any): void {
    this.courseService.createCourse(courseData).subscribe({
      next: (response) => {
        this.snackBar.open('Curso creado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear curso:', error);
        this.snackBar.open(
          error.error?.error || 'Error al crear el curso',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  updateCourse(uuid: string, courseData: any): void {
    this.courseService.updateCourse(uuid, courseData).subscribe({
      next: (response) => {
        this.snackBar.open('Curso actualizado exitosamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      },
      error: (error) => {
        console.error('Error al actualizar curso:', error);
        this.snackBar.open(
          error.error?.error || 'Error al actualizar el curso',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  deleteCourse(course: Course): void {
    // Nota: El backend no tiene endpoint DELETE para cursos
    // Esto debería implementarse en el backend si es necesario
    this.snackBar.open(
      'La eliminación de cursos no está disponible actualmente',
      'Cerrar',
      { duration: 5000 }
    );
  }

  clearFilters(): void {
    this.modalityFilter.reset();
    this.careerFilter.reset();
    this.cycleFilter.reset();
    this.knowledgeAreaFilter.reset();
    this.searchFilter.reset();
    this.typeFilter.reset();
  }

  expandAllPanels(): void {
    this.coursesGrouped.forEach(modalityGroup => {
      modalityGroup.careers.forEach(careerGroup => {
        const panelId = `${modalityGroup.modality.uuid}-${careerGroup.career.uuid}`;
        this.expandedPanels.add(panelId);
      });
    });
  }

  collapseAllPanels(): void {
    this.expandedPanels.clear();
  }

  // Export/Import Methods (Para futuras implementaciones)
  exportCourses(): void {
    // Implementar exportación a Excel/CSV
    this.snackBar.open('Función de exportación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  importCourses(): void {
    // Implementar importación desde Excel/CSV
    this.snackBar.open('Función de importación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  // TrackBy Functions para optimizar el renderizado
  trackByModalityId(index: number, item: CoursesGrouped): string {
    return item.modality.uuid;
  }

  trackByCareerId(index: number, item: CareerWithCourses): string {
    return item.career.uuid;
  }

  trackByCycleNumber(index: number, item: CycleWithCourses): number {
    return item.cycleNumber;
  }

  trackByCourseId(index: number, item: Course): string {
    return item.uuid;
  }
}
