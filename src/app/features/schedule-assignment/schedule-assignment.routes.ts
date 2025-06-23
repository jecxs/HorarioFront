// src/app/features/schedule-assignment/schedule-assignment.routes.ts
import { Routes } from '@angular/router';

export const SCHEDULE_ASSIGNMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/schedule-assignment-main/schedule-assignment-main.component')
        .then(m => m.ScheduleAssignmentMainComponent)
  },
  /*
  {
    path: 'by-teacher',
    loadComponent: () =>
      import('./components/schedule-by-teacher/schedule-by-teacher.component')
        .then(m => m.ScheduleByTeacherComponent)
  },
  */
  {
    path: 'by-group',
    loadComponent: () =>
      import('./components/schedule-by-group/schedule-by-group.component')
        .then(m => m.ScheduleByGroupComponent)
  }
];
