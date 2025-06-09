// src/app/features/carreras/carreras.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarreraListComponent } from './components/carrera-list/carrera-list.component';

@Component({
  selector: 'app-carreras',
  standalone: true,
  imports: [
    CommonModule,
    CarreraListComponent
  ],
  template: `
    <div class="carreras-container">
      <app-carrera-list></app-carrera-list>
    </div>
  `,
  styles: [`
    .carreras-container {
      min-height: calc(100vh - 64px);
    }
  `]
})
export class CarrerasComponent {}
