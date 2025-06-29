// src/app/features/periods/services/period.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Period {
  uuid: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PeriodResponse {
  message: string;
  data: Period[] | Period;
}

@Injectable({
  providedIn: 'root'
})
export class PeriodService {
  private apiUrl = `${environment.apiBaseUrl}/protected/periods`;

  // BehaviorSubject para mantener el periodo seleccionado en toda la aplicación
  private currentPeriodSubject = new BehaviorSubject<Period | null>(null);
  currentPeriod$ = this.currentPeriodSubject.asObservable();

  constructor(private http: HttpClient) {
    // Intentar recuperar el periodo del localStorage al iniciar
    this.loadSavedPeriod();
  }

  // ✅ NUEVO: Cargar periodo guardado con validación
  private loadSavedPeriod(): void {
    try {
      const savedPeriod = localStorage.getItem('currentPeriod');
      if (savedPeriod) {
        const period = JSON.parse(savedPeriod);
        this.currentPeriodSubject.next(period);
        console.log('📅 Periodo cargado desde localStorage:', period.name);
      }
    } catch (error) {
      console.error('Error loading saved period:', error);
      localStorage.removeItem('currentPeriod');
    }
  }

  // Obtener todos los periodos
  getAllPeriods(): Observable<PeriodResponse> {
    return this.http.get<PeriodResponse>(this.apiUrl);
  }

  // Obtener un periodo por ID
  getPeriodById(uuid: string): Observable<PeriodResponse> {
    return this.http.get<PeriodResponse>(`${this.apiUrl}/${uuid}`);
  }

  // Crear un nuevo periodo
  createPeriod(period: Omit<Period, 'uuid'>): Observable<PeriodResponse> {
    return this.http.post<PeriodResponse>(this.apiUrl, period);
  }

  // Actualizar un periodo existente
  updatePeriod(uuid: string, period: Omit<Period, 'uuid'>): Observable<PeriodResponse> {
    return this.http.put<PeriodResponse>(`${this.apiUrl}/${uuid}`, period);
  }

  // Eliminar un periodo
  deletePeriod(uuid: string): Observable<PeriodResponse> {
    return this.http.delete<PeriodResponse>(`${this.apiUrl}/${uuid}`);
  }

  // ✅ MEJORADO: Establecer el periodo actual con notificaciones
  setCurrentPeriod(period: Period): void {
    const previousPeriod = this.currentPeriodSubject.value;

    console.log('📅 Cambiando periodo:', {
      from: previousPeriod?.name || 'ninguno',
      to: period.name
    });

    this.currentPeriodSubject.next(period);
    localStorage.setItem('currentPeriod', JSON.stringify(period));

    // ✅ Emitir evento global para que componentes se refresquen
    window.dispatchEvent(new CustomEvent('period-changed', {
      detail: {
        newPeriod: period,
        previousPeriod
      }
    }));
  }

  // ✅ MEJORADO: Limpiar con notificación
  clearCurrentPeriod(): void {
    const previousPeriod = this.currentPeriodSubject.value;
    console.log('📅 Limpiando periodo actual:', previousPeriod?.name || 'ninguno');

    this.currentPeriodSubject.next(null);
    localStorage.removeItem('currentPeriod');

    // ✅ Emitir evento de limpieza
    window.dispatchEvent(new CustomEvent('period-cleared', {
      detail: { previousPeriod }
    }));
  }

  // Obtener el periodo actual
  getCurrentPeriod(): Period | null {
    return this.currentPeriodSubject.value;
  }

  // ✅ NUEVO: Verificar si hay periodo seleccionado
  hasPeriodSelected(): boolean {
    return this.currentPeriodSubject.value !== null;
  }

  // ✅ NUEVO: Obtener nombre del periodo actual
  getCurrentPeriodName(): string {
    const period = this.currentPeriodSubject.value;
    return period ? period.name : 'Sin periodo seleccionado';
  }
}
