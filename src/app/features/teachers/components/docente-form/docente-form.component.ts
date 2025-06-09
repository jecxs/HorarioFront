// src/app/features/docentes/components/docente-form/docente-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';

import {
  TeacherResponse,
  TeacherRequest,
  TeacherUpdateRequest,
  AcademicDepartmentResponse,
  KnowledgeAreaResponse,
  AcademicDepartmentRequest,
  KnowledgeAreaRequest

} from '../../models/docente.model';
import { DocenteService } from '../../services/docente.service';

export interface DocenteFormData {
  docente?: TeacherResponse;
  isEdit?: boolean;
  departamentos?: AcademicDepartmentResponse[];
  areasConocimiento?: KnowledgeAreaResponse[];
}

@Component({
  selector: 'app-docente-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCheckboxModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule,
    MatCardModule
  ],
  templateUrl: './docente-form.component.html',
  styleUrls: ['./docente-form.component.scss']
})
export class DocenteFormComponent implements OnInit {
  docenteForm: FormGroup;
  departamentoForm: FormGroup;
  areaConocimientoForm: FormGroup;

  isEdit: boolean = false;
  departamentos: AcademicDepartmentResponse[] = [];
  areasConocimiento: KnowledgeAreaResponse[] = [];
  filteredAreas: KnowledgeAreaResponse[] = [];

  submitting = false;
  creatingDepartamento = false;
  creatingArea = false;
  showDepartamentoForm = false;
  showAreaForm = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DocenteFormComponent>,
    private docenteService: DocenteService,
    @Inject(MAT_DIALOG_DATA) public data: DocenteFormData
  ) {
    this.isEdit = data?.isEdit || false;
    this.departamentos = data?.departamentos || [];
    this.areasConocimiento = data?.areasConocimiento || [];

    this.docenteForm = this.createDocenteForm();
    this.departamentoForm = this.createDepartamentoForm();
    this.areaConocimientoForm = this.createAreaConocimientoForm();

    this.filteredAreas = [...this.areasConocimiento];
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.docente) {
      this.loadDocenteData(this.data.docente);
    }

    // Filtra áreas cuando cambia el departamento
    this.docenteForm.get('departmentUuid')?.valueChanges.subscribe(departmentUuid => {
      this.filterAreasByDepartment(departmentUuid);

      // Actualiza el form de áreas de conocimiento con el departamento seleccionado
      this.areaConocimientoForm.patchValue({
        departmentUuid: departmentUuid
      });
    });
  }

  private createDocenteForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      phone: ['', [
        Validators.maxLength(20)
      ]],
      departmentUuid: ['', [
        Validators.required
      ]],
      knowledgeAreaUuids: [[], []]
    });
  }

  private createDepartamentoForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      code: ['', [
        Validators.maxLength(10)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]]
    });
  }

  private createAreaConocimientoForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]],
      departmentUuid: ['', [
        Validators.required
      ]]
    });
  }

  private loadDocenteData(docente: TeacherResponse): void {
    this.docenteForm.patchValue({
      fullName: docente.fullName,
      email: docente.email,
      phone: docente.phone || '',
      departmentUuid: docente.department.uuid,
      knowledgeAreaUuids: docente.knowledgeAreas.map(area => area.uuid)
    });

    // Si es modo edición, deshabilitar el campo de email ya que no se puede modificar
    if (this.isEdit) {
      this.docenteForm.get('email')?.disable();
    }
  }

  private filterAreasByDepartment(departmentUuid: string): void {
    if (!departmentUuid) {
      this.filteredAreas = [...this.areasConocimiento];
      return;
    }

    this.filteredAreas = this.areasConocimiento.filter(
      area => area.department?.uuid === departmentUuid
    );
  }

  onSubmit(): void {
    if (this.docenteForm.valid) {
      this.submitting = true;
      const formValue = this.docenteForm.value;

      // Asegurarse de que knowledgeAreaUuids sea un array incluso si está vacío
      if (!formValue.knowledgeAreaUuids) {
        formValue.knowledgeAreaUuids = [];
      }

      if (this.isEdit) {
        // Para edición, usamos TeacherUpdateRequest
        const docenteData: TeacherUpdateRequest = {
          fullName: formValue.fullName.trim(),
          phone: formValue.phone?.trim(),
          departmentUuid: formValue.departmentUuid,
          knowledgeAreaUuids: formValue.knowledgeAreaUuids
        };

        this.dialogRef.close({
          action: 'update',
          data: docenteData,
          uuid: this.data.docente?.uuid
        });
      } else {
        // Para creación, usamos TeacherRequest
        const docenteData: TeacherRequest = {
          fullName: formValue.fullName.trim(),
          email: formValue.email.trim(),
          phone: formValue.phone?.trim(),
          departmentUuid: formValue.departmentUuid,
          knowledgeAreaUuids: formValue.knowledgeAreaUuids
        };

        this.dialogRef.close({
          action: 'create',
          data: docenteData
        });
      }
    }
  }

  toggleDepartamentoForm(): void {
    this.showDepartamentoForm = !this.showDepartamentoForm;
    if (!this.showDepartamentoForm) {
      this.departamentoForm.reset();
    }
  }

  toggleAreaForm(): void {
    this.showAreaForm = !this.showAreaForm;
    if (!this.showAreaForm) {
      this.areaConocimientoForm.reset();

      // Si hay un departamento seleccionado, establecerlo en el form de área
      const departmentUuid = this.docenteForm.get('departmentUuid')?.value;
      if (departmentUuid) {
        this.areaConocimientoForm.patchValue({
          departmentUuid: departmentUuid
        });
      }
    }
  }

  createDepartamento(): void {
    if (this.departamentoForm.valid) {
      this.creatingDepartamento = true;
      const departamentoData: AcademicDepartmentRequest = {
        name: this.departamentoForm.value.name.trim(),
        code: this.departamentoForm.value.code?.trim(),
        description: this.departamentoForm.value.description?.trim()
      };

      this.docenteService.createDepartment(departamentoData)
        .pipe(finalize(() => this.creatingDepartamento = false))
        .subscribe({
          next: (response) => {
            const newDepartamento = response.data;
            this.departamentos.push(newDepartamento);
            this.departamentos = [...this.departamentos]; // Forzar actualización

            // Seleccionar el nuevo departamento
            this.docenteForm.patchValue({
              departmentUuid: newDepartamento.uuid
            });

            // Limpiar y cerrar el formulario
            this.departamentoForm.reset();
            this.showDepartamentoForm = false;
          },
          error: (error) => {
            console.error('Error al crear departamento:', error);
            // Manejar el error aquí (mostrar mensaje, etc.)
          }
        });
    }
  }

  createArea(): void {
    if (this.areaConocimientoForm.valid) {
      this.creatingArea = true;
      const areaData: KnowledgeAreaRequest = {
        name: this.areaConocimientoForm.value.name.trim(),
        description: this.areaConocimientoForm.value.description?.trim(),
        departmentUuid: this.areaConocimientoForm.value.departmentUuid
      };

      this.docenteService.createKnowledgeArea(areaData)
        .pipe(finalize(() => this.creatingArea = false))
        .subscribe({
          next: (response) => {
            const newArea = response.data;
            this.areasConocimiento.push(newArea);
            this.areasConocimiento = [...this.areasConocimiento]; // Forzar actualización

            // Filtrar áreas por departamento
            this.filterAreasByDepartment(this.docenteForm.get('departmentUuid')?.value);

            // Añadir la nueva área a las seleccionadas
            const currentAreas = this.docenteForm.get('knowledgeAreaUuids')?.value || [];
            this.docenteForm.patchValue({
              knowledgeAreaUuids: [...currentAreas, newArea.uuid]
            });

            // Limpiar y cerrar el formulario
            this.areaConocimientoForm.reset();
            this.showAreaForm = false;

            // Restaurar el departamento seleccionado en el form de área
            const departmentUuid = this.docenteForm.get('departmentUuid')?.value;
            if (departmentUuid) {
              this.areaConocimientoForm.patchValue({
                departmentUuid: departmentUuid
              });
            }
          },
          error: (error) => {
            console.error('Error al crear área de conocimiento:', error);
            // Manejar el error aquí (mostrar mensaje, etc.)
          }
        });
    }
  }

  compareObjects(o1: any, o2: any): boolean {
    if (o1 && o2) {
      return o1 === o2;
    }
    return false;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getDepartmentName(uuid: string): string {
    const dept = this.departamentos.find(d => d.uuid === uuid);
    return dept ? dept.name : '';
  }
}
