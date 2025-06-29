// src/app/shared/services/base-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  message?: string;
  data: T;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected readonly apiUrl = environment.apiBaseUrl;

  constructor(protected http: HttpClient) {}

  protected get<T>(endpoint: string, params?: HttpParams): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, { params });
  }

  protected post<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data);
  }

  protected put<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data);
  }

  protected patch<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data);
  }

  protected delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.apiUrl}${endpoint}`);
  }

  // Métodos para construir URLs completas
  protected buildUrl(endpoint: string): string {
    return `${this.apiUrl}${endpoint}`;
  }

  // Método para crear parámetros HTTP
  protected createParams(params: { [key: string]: any }): HttpParams {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });
    return httpParams;
  }

  // ✅ NUEVO: Método específico para endpoints con periodo
  protected getWithPeriod<T>(endpoint: string, additionalParams?: HttpParams): Observable<ApiResponse<T>> {
    // El interceptor se encargará de agregar el periodUuid automáticamente
    return this.get<T>(endpoint, additionalParams);
  }

  protected postWithPeriod<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    // El interceptor se encargará de agregar el periodUuid automáticamente
    return this.post<T>(endpoint, data);
  }
}
