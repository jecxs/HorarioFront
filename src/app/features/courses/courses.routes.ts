// src/app/features/courses/courses.routes.ts
import { Routes } from '@angular/router';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/courses.component').then(m => m.CoursesComponent)
  }
];
