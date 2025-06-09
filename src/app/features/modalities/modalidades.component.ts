// src/app/features/modalidades/modalidades.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalidadListComponent } from './components/modalidad-list/modalidad-list.component';

@Component({
  selector: 'app-modalidades',
  standalone: true,
  imports: [
    CommonModule,
    ModalidadListComponent
  ],
  template: `
    <div class="modalidades-container">
      <app-modalidad-list></app-modalidad-list>
    </div>
  `,
  styles: [`
    .modalidades-container {
      min-height: calc(100vh - 64px);
    }
  `]
})
export class ModalidadesComponent {}
