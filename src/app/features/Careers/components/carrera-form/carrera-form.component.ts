// src/app/features/carreras/components/carrera-form/carrera-form.component.ts
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
import { finalize } from 'rxjs/operators';

import {
  CareerResponse,
  CareerRequest,
  EducationalModalityResponse
} from '../../models/carrera.model';
import { CarreraService } from '../../services/carrera.service';

export interface CarreraFormData {
  carrera?: CareerResponse;
  isEdit?: boolean;
}

@Component({
  selector: 'app-carrera-form',
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
    MatProgressSpinnerModule
  ],
  templateUrl: `carrera-form.component.html`,
  styleUrls: ['./carrera-form.component.scss']
})
export class CarreraFormComponent implements OnInit {
  carreraForm: FormGroup;
  isEdit: boolean = false;
  modalidades: EducationalModalityResponse[] = [];
  loadingModalidades = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CarreraFormComponent>,
    private carreraService: CarreraService,
    @Inject(MAT_DIALOG_DATA) public data: CarreraFormData
  ) {
    this.isEdit = data?.isEdit || false;
    this.carreraForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadModalidades();

    if (this.isEdit && this.data.carrera) {
      this.loadCarreraData(this.data.carrera);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      modalityId: ['', [
        Validators.required
      ]]
    });
  }

  private loadModalidades(): void {
    this.loadingModalidades = true;
    this.carreraService.getAllModalidades()
      .pipe(finalize(() => this.loadingModalidades = false))
      .subscribe({
        next: (response) => {
          this.modalidades = response.data;
        },
        error: (error) => {
          console.error('Error al cargar modalidades:', error);
        }
      });
  }

  private loadCarreraData(carrera: CareerResponse): void {
    this.carreraForm.patchValue({
      name: carrera.name,
      modalityId: carrera.modality.uuid
    });
  }

  get selectedModalidad(): EducationalModalityResponse | undefined {
    const modalityId = this.carreraForm.get('modalityId')?.value;
    return this.modalidades.find(m => m.uuid === modalityId);
  }

  onSubmit(): void {
    if (this.carreraForm.valid) {
      this.submitting = true;
      const formValue = this.carreraForm.value;
      const carreraData: CareerRequest = {
        name: formValue.name.trim(),
        modalityId: formValue.modalityId
      };

      this.dialogRef.close({
        action: this.isEdit ? 'update' : 'create',
        data: carreraData,
        uuid: this.data.carrera?.uuid
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
