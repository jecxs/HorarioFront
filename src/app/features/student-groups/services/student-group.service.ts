// src/app/features/student-groups/services/student-group.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import { StudentGroupResponse } from '../../schedule-assignment/models/class-session.model';

export interface StudentGroup {
  uuid: string;
  name: string;
  cycleUuid: string;
  cycleNumber: number;
  periodUuid: string;
  periodName: string;
  careerUuid: string;        // ✅ AGREGAR
  careerName: string;        // ✅ AGREGAR
  modalityUuid?: string;     // ✅ AGREGAR (opcional)
  modalityName?: string;     // ✅ AGREGAR (opcional)
}

export interface StudentGroupRequest {
  name: string;
  cycleUuid: string;
  periodUuid: string;
}

export interface Cycle {
  uuid: string;
  number: number;
  career: {
    uuid: string;
    name: string;
    modality: {
      uuid: string;
      name: string;
      durationYears: number;
    };
  };
}

export interface Career {
  uuid: string;
  name: string;
  modality: {
    uuid: string;
    name: string;
    durationYears: number;
  };
  cycles: Cycle[];
}

@Injectable({
  providedIn: 'root'
})
export class StudentGroupService extends BaseApiService {

  // ✅ CORREGIDO: Usar getWithPeriod para filtrar por periodo actual
  getAllGroups(): Observable<any> {
    return this.getWithPeriod<StudentGroup[]>('/protected/student-groups');
  }

  // ✅ CORREGIDO: Usar getWithPeriod
  getGroupById(uuid: string): Observable<any> {
    return this.getWithPeriod<StudentGroup>(`/protected/student-groups/${uuid}`);
  }

  // ✅ CORREGIDO: Usar postWithPeriod para crear en el periodo actual
  createGroup(group: StudentGroupRequest): Observable<any> {
    return this.postWithPeriod<StudentGroup>('/protected/student-groups', group);
  }

  // ✅ CORREGIDO: Mantener put normal ya que es actualización específica
  updateGroup(uuid: string, group: StudentGroupRequest): Observable<any> {
    return this.patch<StudentGroup>(`/protected/student-groups/${uuid}`, group);
  }

  // ✅ Sin cambios - delete es específico por UUID
  deleteGroup(uuid: string): Observable<any> {
    return this.delete<void>(`/protected/student-groups/${uuid}`);
  }

  // ✅ Sin filtro de periodo - las carreras son globales
  getAllCareers(): Observable<any> {
    return this.get<Career[]>('/protected/career');
  }

  // ✅ Sin filtro de periodo - las modalidades son globales
  getAllModalities(): Observable<any> {
    return this.get<any[]>('/protected/educational-modalities');
  }
}
