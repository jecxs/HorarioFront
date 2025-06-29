// src/app/shared/interceptors/period.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PeriodService } from '../../features/periods/services/period.service';

@Injectable()
export class PeriodInterceptor implements HttpInterceptor {

  constructor(private periodService: PeriodService) {
    console.log('🏗️ PeriodInterceptor initialized'); // ✅ Debug de inicialización
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🔍 PeriodInterceptor - Checking request:', req.url); // ✅ Debug de cada request

    const currentPeriod = this.periodService.getCurrentPeriod();
    console.log('📅 Current period:', currentPeriod?.name || 'No period'); // ✅ Debug del periodo

    // Solo agregar periodUuid a endpoints que lo necesiten
    if (this.shouldAddPeriodFilter(req.url)) {
      console.log('✅ URL should have period filter:', req.url); // ✅ Debug del filtro

      if (currentPeriod) {
        console.log(`🔄 Adding period ${currentPeriod.name} to request: ${req.url}`);

        // ✅ SIMPLIFICADO: Método más directo
        const modifiedReq = req.clone({
          setParams: {
            periodUuid: currentPeriod.uuid
          }
        });

        console.log('📤 Modified request params:', modifiedReq.params.get('periodUuid')); // ✅ Verificar que se agregó
        return next.handle(modifiedReq);
      } else {
        console.log('⚠️ No current period, skipping filter for:', req.url);
      }
    } else {
      console.log('❌ URL does NOT need period filter:', req.url); // ✅ Debug cuando no aplica
    }

    return next.handle(req);
  }

  private shouldAddPeriodFilter(url: string): boolean {
    // ✅ Lista de endpoints que requieren filtro de periodo
    const endpointsWithPeriod = [
      '/protected/class-sessions',
      '/protected/student-groups'
    ];

    // ✅ Excluir endpoints que NO deben tener filtro automático
    const excludedEndpoints = [
      '/protected/periods',
      '/protected/educational-modalities',
      '/protected/career',
      '/protected/teachers',
      '/protected/courses',
      '/protected/learning-space',
      '/protected/timeslots',
      '/protected/teaching-types',
      '/protected/academic-departments',
      '/protected/knowledge-areas',
      '/auth/'
    ];

    // ✅ Verificar si debe excluirse
    const shouldExclude = excludedEndpoints.some(endpoint => url.includes(endpoint));
    if (shouldExclude) {
      return false;
    }

    // ✅ Verificar si debe incluirse
    const shouldInclude = endpointsWithPeriod.some(endpoint => url.includes(endpoint));

    console.log(`🔍 shouldAddPeriodFilter for ${url}:`, shouldInclude); // ✅ Debug de la decisión
    return shouldInclude;
  }
}
