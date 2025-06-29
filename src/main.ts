// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';
import { ApiInterceptor } from './app/shared/services/api.interceptor';
import { PeriodInterceptor } from './app/shared/interceptors/period.interceptor'; // ✅ AGREGAR

// Registrar localización en español
registerLocaleData(localeEs);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi()
    ),
    // ✅ AGREGAR: Los interceptors en el orden correcto
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PeriodInterceptor, // ✅ AGREGAR el PeriodInterceptor
      multi: true
    },
    { provide: 'API_BASE_URL', useValue: environment.apiBaseUrl },
    { provide: LOCALE_ID, useValue: 'es' },
    provideAnimations()
  ]
});
