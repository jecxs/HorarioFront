// src/app/features/time-slots/time-slots.routes.ts
import { Routes } from '@angular/router';

export const TIME_SLOTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/time-slots.component').then(m => m.TimeSlotsComponent)
  }
];
