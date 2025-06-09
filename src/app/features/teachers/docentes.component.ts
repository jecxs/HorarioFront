// src/app/features/docentes/docentes.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocenteListComponent } from './components/docente-list/docente-list.component';

@Component({
  selector: 'app-docentes',
  standalone: true,
  imports: [
    CommonModule,
    DocenteListComponent
  ],
  template: `
    <div class="docentes-container">
      <app-docente-list></app-docente-list>
    </div>
  `,
  styles: [`
    .docentes-container {
      min-height: calc(100vh - 64px);
    }
  `]
})
export class DocentesComponent {}
