// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // ✅ AGREGAR
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { PeriodInterceptor } from './shared/interceptors/period.interceptor';
import { ApiInterceptor } from './shared/services/api.interceptor'; // ✅ AGREGAR

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(), // ✅ AGREGAR
    // ✅ CONFIGURAR AMBOS INTERCEPTORS EN ORDEN CORRECTO
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor, // ✅ Primero el de autenticación
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PeriodInterceptor, // ✅ Después el de periodo
      multi: true
    }
  ]
};
