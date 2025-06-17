// src/app/features/class-assignments/class-assignments.routes.ts
import { Routes } from '@angular/router';

export const CLASS_ASSIGNMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/class-assignments.component').then(m => m.ClassAssignmentsComponent)
  },
  {
    path: 'schedule-board',
    loadComponent: () =>
      import('./components/schedule-board/schedule-board.component').then(m => m.ScheduleBoardComponent)
  },
  {
    path: 'teacher-view/:teacherId',
    loadComponent: () =>
      import('./components/teacher-schedule/teacher-schedule.component').then(m => m.TeacherScheduleComponent)
  },
  {
    path: 'group-view/:groupId',
    loadComponent: () =>
      import('./components/group-schedule/group-schedule.component').then(m => m.GroupScheduleComponent)
  }
];
