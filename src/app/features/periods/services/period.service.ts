// src/app/shared/services/period.service.ts
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
    const savedPeriod = localStorage.getItem('currentPeriod');
    if (savedPeriod) {
      this.currentPeriodSubject.next(JSON.parse(savedPeriod));
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

  // Establecer el periodo actual con el que se está trabajando
  setCurrentPeriod(period: Period): void {
    this.currentPeriodSubject.next(period);
    localStorage.setItem('currentPeriod', JSON.stringify(period));
  }

  // Limpiar el periodo actual
  clearCurrentPeriod(): void {
    this.currentPeriodSubject.next(null);
    localStorage.removeItem('currentPeriod');
  }

  // Obtener el periodo actual
  getCurrentPeriod(): Period | null {
    return this.currentPeriodSubject.value;
  }
}
