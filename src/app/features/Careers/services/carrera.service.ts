// src/app/features/carreras/services/carrera.service.ts
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CareerRequest,
  CareerResponse,
  EducationalModalityResponse
} from '../models/carrera.model';
import { BaseApiService,ApiResponse } from '../../../shared/services/base-api.service';

@Injectable({
  providedIn: 'root'
})
export class CarreraService extends BaseApiService {

  private readonly careerEndpoint = '/protected/career';
  private readonly modalitiesEndpoint = '/protected/educational-modalities';

  /** === CARRERAS === */

  /** Obtener todas las carreras */
  getAllCareers(params?: { [key: string]: any })
    : Observable<ApiResponse<CareerResponse[]>> {
    const httpParams = params ? this.createParams(params) : undefined;
    return this.get<CareerResponse[]>(this.careerEndpoint, httpParams);
  }

  /** Crear una nueva carrera */
  createCareer(body: CareerRequest)
    : Observable<ApiResponse<CareerResponse>> {
    return this.post<CareerResponse>(this.careerEndpoint, body);
  }

  /** Actualizar carrera existente */
  updateCareer(uuid: string, body: CareerRequest)
    : Observable<ApiResponse<CareerResponse>> {
    return this.patch<CareerResponse>(
      `${this.careerEndpoint}/${uuid}`,
      body
    );
  }

  /** Eliminar carrera */
  deleteCareer(uuid: string)
    : Observable<ApiResponse<void>> {
    return this.delete<void>(
      `${this.careerEndpoint}/${uuid}`
    );
  }

  /** === MODALIDADES (para dropdown) === */

  /** Obtener todas las modalidades para selección */
  getAllModalidades(params?: { [key: string]: any })
    : Observable<ApiResponse<EducationalModalityResponse[]>> {
    const httpParams = params ? this.createParams(params) : undefined;
    return this.get<EducationalModalityResponse[]>(
      this.modalitiesEndpoint,
      httpParams
    );
  }
}
