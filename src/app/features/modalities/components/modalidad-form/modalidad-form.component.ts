import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { EducationalModalityResponse, EducationalModalityRequest } from '../../models/modalidad.model';

export interface ModalidadFormData {
  modalidad?: EducationalModalityResponse;
  isEdit?: boolean;
}

@Component({
  selector: 'app-modalidad-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: `modalidad-form.component.html`,
  styleUrls: ['./modalidad-form.component.scss']
})
export class ModalidadFormComponent implements OnInit {
  modalidadForm: FormGroup;
  isEdit: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalidadFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalidadFormData
  ) {
    this.isEdit = data?.isEdit || false;
    this.modalidadForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.modalidad) {
      this.loadModalidadData(this.data.modalidad);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      durationYears: ['', [
        Validators.required,
        Validators.min(1),
        Validators.max(5)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]]
    });
  }

  private loadModalidadData(modalidad: EducationalModalityResponse): void {
    this.modalidadForm.patchValue({
      name: modalidad.name,
      durationYears: modalidad.durationYears,
      description: modalidad.description || ''
    });
  }

  onSubmit(): void {
    if (this.modalidadForm.valid) {
      const formValue = this.modalidadForm.value;
      const modalidadData: EducationalModalityRequest = {
        name: formValue.name.trim(),
        durationYears: formValue.durationYears,
        description: formValue.description?.trim() || undefined
      };

      this.dialogRef.close({
        action: this.isEdit ? 'update' : 'create',
        data: modalidadData,
        uuid: this.data.modalidad?.uuid
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
