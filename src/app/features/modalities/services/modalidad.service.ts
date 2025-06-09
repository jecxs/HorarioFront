// ejemplo: src/app/features/modalidades/services/modalidad.service.ts
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EducationalModalityRequest,
  EducationalModalityResponse
} from '../models/modalidad.model';
import {ApiResponse, BaseApiService} from '../../../shared/services/base-api.service';

@Injectable({ providedIn: 'root' })
export class ModalidadService extends BaseApiService {

  private readonly endpoint = '/protected/educational-modalities';

  getAllModalidades(params?: { [key: string]: any })
    : Observable<ApiResponse<EducationalModalityResponse[]>> {
    const httpParams = params ? this.createParams(params) : undefined;
    return this.get<EducationalModalityResponse[]>(this.endpoint, httpParams);
  }

  createModalidad(body: EducationalModalityRequest)
    : Observable<ApiResponse<EducationalModalityResponse>> {
    return this.post<EducationalModalityResponse>(this.endpoint, body);
  }

  updateModalidad(uuid: string, body: EducationalModalityRequest)
    : Observable<ApiResponse<EducationalModalityResponse>> {
    return this.patch<EducationalModalityResponse>(
      `${this.endpoint}/${uuid}`, body
    );
  }

  deleteModalidad(uuid: string)
    : Observable<ApiResponse<void>> {
    return this.delete<void>(`${this.endpoint}/${uuid}`);
  }

}
