import { Routes } from '@angular/router';
import { DocentesComponent } from './docentes.component';
import { DocentePerfilComponent } from './components/docente-perfil/docente-perfil.component';
import {MiDisponibilidadComponent} from './components/mi-disponibilidad/mi-disponibilidad.component';

export const DOCENTES_ROUTES: Routes = [
  {
    path: '',
    component: DocentesComponent
  },
  {
    path: 'view/:id',
    component: DocentePerfilComponent
  },
  {
    path: 'mi-disponibilidad',  // ✅ NUEVA RUTA para docentes
    component: MiDisponibilidadComponent
  }
];
