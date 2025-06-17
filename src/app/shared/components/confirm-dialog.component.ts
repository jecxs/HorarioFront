// src/app/shared/components/confirm-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon [style.color]="getIconColor()">{{ getIcon() }}</mat-icon>
        {{ data.title }}
      </h2>

      <div mat-dialog-content class="dialog-content">
        <p class="message">{{ data.message }}</p>
        <p *ngIf="data.warningMessage" class="warning-message">
          <mat-icon>warning</mat-icon>
          {{ data.warningMessage }}
        </p>
      </div>

      <div mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="onCancel()">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button
          mat-raised-button
          [color]="data.confirmColor || 'warn'"
          (click)="onConfirm()">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 300px;
      max-width: 500px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .dialog-content {
      .message {
        margin: 0 0 16px 0;
        color: #333;
        line-height: 1.4;
      }

      .warning-message {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
        padding: 12px;
        background: #fff3e0;
        border: 1px solid #ffcc02;
        border-radius: 4px;
        color: #e65100;
        font-size: 0.9rem;
        line-height: 1.3;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #ff9800;
          margin-top: 1px;
        }
      }
    }

    .dialog-actions {
      margin-top: 24px;
      gap: 8px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  getIcon(): string {
    switch (this.data.confirmColor) {
      case 'warn':
        return 'warning';
      case 'primary':
        return 'help';
      case 'accent':
        return 'info';
      default:
        return 'warning';
    }
  }

  getIconColor(): string {
    switch (this.data.confirmColor) {
      case 'warn':
        return '#f44336';
      case 'primary':
        return '#1976d2';
      case 'accent':
        return '#7b1fa2';
      default:
        return '#f44336';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
