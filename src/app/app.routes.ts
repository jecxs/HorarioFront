// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  // Ruta pública de login
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  // Siempre redirige al login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Dashboard con layout común
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      // Home del dashboard
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardHomeComponent)
      },
      // Modalidades educativas
      {
        path: 'modalidades',
        loadComponent: () =>
          import('./features/modalities/modalidades.component').then(m => m.ModalidadesComponent)
      },
      {
        path: 'carreras',
        loadComponent: () =>
          import('./features/Careers/carreras.component').then(m => m.CarrerasComponent)
      },
      {
        path: 'docentes',
        loadChildren: () => import('./features/teachers/docentes.routes').then(routes => routes.DOCENTES_ROUTES)
      },
      {
        path: 'periodos',
        loadComponent: () =>
          import('./features/periods/components/period-list.component').then(m => m.PeriodListComponent)
      },
      {
        path: 'grupos',
        loadComponent: () =>
          import('./features/student-groups/components/student-groups.component').then(m => m.StudentGroupsComponent)
      },
      {
        path: 'ambientes',
        loadComponent: () =>
          import('./features/learning-spaces/components/learning-spaces.component').then(m => m.LearningSpacesComponent)
      },
      {
        path: 'cursos', // 👈 NUEVA RUTA
        loadChildren: () => import('./features/courses/courses.routes').then(routes => routes.COURSES_ROUTES)
      },
      {
        path: 'turnos',
        loadComponent: () => import('./features/time-slots/components/time-slots.component').then(m => m.TimeSlotsComponent)
      },

    ]
  },
  // Wildcard route - debe ir al final
  { path: '**', redirectTo: 'login' }
];
