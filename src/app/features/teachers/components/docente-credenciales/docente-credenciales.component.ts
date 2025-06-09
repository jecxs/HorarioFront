// src/app/features/docentes/components/docente-credenciales/docente-credenciales.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { TeacherResponse } from '../../models/docente.model';

export interface CredencialesDialogData {
  docente: TeacherResponse;
}

@Component({
  selector: 'app-docente-credenciales',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    ClipboardModule
  ],
  template: `
    <div class="credenciales-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>vpn_key</mat-icon>
        Credenciales de Acceso
      </h2>

      <mat-dialog-content class="dialog-content">
        <div class="docente-info">
          <div class="avatar-container">
            <div class="avatar-circle">
              <span class="avatar-initials">{{ getInitials(docente.fullName) }}</span>
            </div>
          </div>
          <div class="docente-details">
            <h3 class="docente-name">{{ docente.fullName }}</h3>
            <p class="docente-role">Docente</p>
          </div>
        </div>

        <mat-divider></mat-divider>

        <div class="credentials-section">
          <h3 class="section-title">Datos de acceso al sistema</h3>

          <mat-card class="credentials-card">
            <mat-card-content>
              <div class="credential-item">
                <div class="credential-label">
                  <mat-icon>email</mat-icon>
                  <span>Usuario/Email:</span>
                </div>
                <div class="credential-value">
                  <span class="value-text">{{ docente.email }}</span>
                  <button
                    mat-icon-button
                    color="primary"
                    matTooltip="Copiar al portapapeles"
                    [cdkCopyToClipboard]="docente.email"
                    (click)="showCopiedMessage('Email copiado al portapapeles')">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>

              <div class="credential-item">
                <div class="credential-label">
                  <mat-icon>lock</mat-icon>
                  <span>Contraseña inicial:</span>
                </div>
                <div class="credential-value">
                  <span class="value-text">cambio123</span>
                  <button
                    mat-icon-button
                    color="primary"
                    matTooltip="Copiar al portapapeles"
                    [cdkCopyToClipboard]="'cambio123'"
                    (click)="showCopiedMessage('Contraseña copiada al portapapeles')">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <div class="info-section">
            <div class="info-icon">
              <mat-icon>info</mat-icon>
            </div>
            <div class="info-text">
              <p>Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión.</p>
              <p>Comparte estas credenciales con el docente de manera segura.</p>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button
          mat-button
          [cdkCopyToClipboard]="getCredentialsText()"
          (click)="showCopiedMessage('Credenciales copiadas al portapapeles')"
          color="primary">
          <mat-icon>file_copy</mat-icon>
          Copiar Todo
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="close()">
          <mat-icon>check</mat-icon>
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .credenciales-container {
      padding: 16px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #3f51b5;
      font-size: 24px;
    }

    .dialog-content {
      margin-top: 16px;
      padding-bottom: 16px;
    }

    .docente-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .avatar-container {
      flex-shrink: 0;
    }

    .avatar-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #3f51b5;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 500;
    }

    .docente-details {
      flex-grow: 1;
    }

    .docente-name {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .docente-role {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .credentials-section {
      margin-top: 24px;
    }

    .section-title {
      font-size: 18px;
      margin-bottom: 16px;
      color: #333;
    }

    .credentials-card {
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }

    .credential-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
    }

    .credential-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: #666;
    }

    .credential-value {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .value-text {
      font-family: monospace;
      font-size: 16px;
      flex-grow: 1;
    }

    .info-section {
      display: flex;
      gap: 12px;
      padding: 12px;
      background-color: #e8f0fe;
      border-radius: 4px;
    }

    .info-icon {
      color: #3f51b5;
    }

    .info-text p {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 14px;
    }

    .info-text p:last-child {
      margin-bottom: 0;
    }

    @media (max-width: 600px) {
      .credential-item {
        flex-direction: column;
      }
    }
  `]
})
export class DocenteCredencialesComponent {
  docente: TeacherResponse;

  constructor(
    private dialogRef: MatDialogRef<DocenteCredencialesComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: CredencialesDialogData
  ) {
    this.docente = data.docente;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getCredentialsText(): string {
    return `Credenciales de acceso al sistema:
Usuario/Email: ${this.docente.email}
Contraseña inicial: cambio123

IMPORTANTE: Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión.`;
  }

  showCopiedMessage(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
