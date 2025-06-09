import { Routes } from '@angular/router';
import { DocentesComponent } from './docentes.component';
import { DocentePerfilComponent } from './components/docente-perfil/docente-perfil.component';

export const DOCENTES_ROUTES: Routes = [
  {
    path: '',
    component: DocentesComponent
  },
  {
    path: 'view/:id',
    component: DocentePerfilComponent
  }
];
