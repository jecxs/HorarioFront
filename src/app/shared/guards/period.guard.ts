// src/app/shared/guards/period.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PeriodService } from '../../features/periods/services/period.service';

@Injectable({
  providedIn: 'root'
})
export class PeriodGuard implements CanActivate {

  private periodService = inject(PeriodService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentPeriod = this.periodService.getCurrentPeriod();

    if (!currentPeriod) {
      console.log('🚫 PeriodGuard: No hay periodo seleccionado, bloqueando acceso a:', state.url);

      // ✅ Mensaje más específico según la ruta
      const routeName = this.getRouteDisplayName(state.url);

      const snackBarRef = this.snackBar.open(
        `Debe seleccionar un periodo académico para acceder a ${routeName}`,
        'Seleccionar Periodo',
        {
          duration: 8000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar']
        }
      );

      // ✅ Redirigir cuando se haga click en la acción
      snackBarRef.onAction().subscribe(() => {
        this.router.navigate(['/dashboard/periodos'], {
          queryParams: { returnUrl: state.url }
        });
      });

      return false;
    }

    console.log('✅ PeriodGuard: Periodo válido, permitiendo acceso:', currentPeriod.name);
    return true;
  }

  // ✅ Helper para obtener nombre legible de la ruta
  private getRouteDisplayName(url: string): string {
    const routeNames: { [key: string]: string } = {
      '/dashboard/grupos': 'Gestión de Grupos',
      '/dashboard/horarios': 'Asignación de Horarios',
      '/dashboard/class-sessions': 'Sesiones de Clase'
    };

    // Buscar coincidencia exacta o parcial
    for (const [route, name] of Object.entries(routeNames)) {
      if (url.includes(route)) {
        return name;
      }
    }

    return 'esta sección';
  }
}
