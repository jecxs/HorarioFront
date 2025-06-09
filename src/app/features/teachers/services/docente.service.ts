// src/app/features/docentes/services/docente.service.ts
import { Injectable } from '@angular/core';
import { HttpParams, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DocenteCredencialesComponent } from '../components/docente-credenciales/docente-credenciales.component';
import {
  TeacherResponse,
  TeacherWithAvailabilitiesResponse,
  TeacherRequest,
  TeacherUpdateRequest,
  TeacherFilter,
  AcademicDepartmentResponse,
  KnowledgeAreaResponse,

} from '../models/docente.model';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';

@Injectable({
  providedIn: 'root'
})
export class DocenteService extends BaseApiService {

  private readonly teachersEndpoint = '/protected/teachers';
  private readonly departmentsEndpoint = '/protected/academic-departments';
  private readonly knowledgeAreasEndpoint = '/protected/knowledge-areas';


  constructor(
    protected override http: HttpClient,
    private dialog: MatDialog
  ) {
    super(http);
  }
  /** === DOCENTES === */

  /** Obtener todos los docentes */
  getAllTeachers(params?: TeacherFilter): Observable<ApiResponse<TeacherResponse[]>> {
    const httpParams = params ? this.createParams(params) : undefined;
    return this.get<TeacherResponse[]>(this.teachersEndpoint, httpParams);
  }

  /** Obtener docente por ID */
  getTeacherById(uuid: string): Observable<ApiResponse<TeacherResponse>> {
    return this.get<TeacherResponse>(`${this.teachersEndpoint}/${uuid}`);
  }

  /** Obtener docente con disponibilidades */
  getTeacherWithAvailabilities(uuid: string): Observable<ApiResponse<TeacherWithAvailabilitiesResponse>> {
    return this.get<TeacherWithAvailabilitiesResponse>(`${this.teachersEndpoint}/${uuid}/details`);
  }

  /** Crear un nuevo docente */
  createTeacher(body: TeacherRequest): Observable<ApiResponse<TeacherResponse>> {
    return this.post<TeacherResponse>(this.teachersEndpoint, body);
  }

  /** Actualizar docente existente */
  updateTeacher(uuid: string, body: TeacherUpdateRequest): Observable<ApiResponse<TeacherResponse>> {
    return this.put<TeacherResponse>(`${this.teachersEndpoint}/${uuid}`, body);
  }

  /** Eliminar docente */
  deleteTeacher(uuid: string): Observable<ApiResponse<void>> {
    return this.delete<void>(`${this.teachersEndpoint}/${uuid}`);
  }

  /** Filtrar docentes */
  filterTeachers(filter: TeacherFilter): Observable<ApiResponse<TeacherResponse[]>> {
    return this.get<TeacherResponse[]>(`${this.teachersEndpoint}/filter`, this.createParams(filter));
  }

  /** === DEPARTAMENTOS ACADÉMICOS === */

  /** Obtener todos los departamentos académicos */
  getAllDepartments(): Observable<ApiResponse<AcademicDepartmentResponse[]>> {
    return this.get<AcademicDepartmentResponse[]>(this.departmentsEndpoint);
  }

  /** Crear departamento académico */
  createDepartment(body: any): Observable<ApiResponse<AcademicDepartmentResponse>> {
    return this.post<AcademicDepartmentResponse>(this.departmentsEndpoint, body);
  }

  /** === ÁREAS DE CONOCIMIENTO === */

  /** Obtener todas las áreas de conocimiento */
  getAllKnowledgeAreas(): Observable<ApiResponse<KnowledgeAreaResponse[]>> {
    return this.get<KnowledgeAreaResponse[]>(this.knowledgeAreasEndpoint);
  }

  /** Obtener áreas de conocimiento por departamento */
  getKnowledgeAreasByDepartment(departmentUuid: string): Observable<ApiResponse<KnowledgeAreaResponse[]>> {
    return this.get<KnowledgeAreaResponse[]>(`${this.knowledgeAreasEndpoint}/department/${departmentUuid}`);
  }

  /** Crear área de conocimiento */
  createKnowledgeArea(body: any): Observable<ApiResponse<KnowledgeAreaResponse>> {
    return this.post<KnowledgeAreaResponse>(this.knowledgeAreasEndpoint, body);
  }

  /** === DISPONIBILIDAD DE DOCENTES === */

  openCredentialsDialog(docente: TeacherResponse) {
    return this.dialog.open(DocenteCredencialesComponent, {
      width: '550px',
      data: { docente },
      disableClose: false
    });
  }
}
