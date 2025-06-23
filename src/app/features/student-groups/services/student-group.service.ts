// src/app/features/student-groups/services/student-group.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../shared/services/base-api.service';


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

  // Obtener todos los grupos
  getAllGroups(): Observable<any> {
    return this.get<StudentGroup[]>('/protected/student-groups');
  }

  // Obtener un grupo por ID
  getGroupById(uuid: string): Observable<any> {
    return this.get<StudentGroup>(`/protected/student-groups/${uuid}`);
  }

  // Crear un nuevo grupo
  createGroup(group: StudentGroupRequest): Observable<any> {
    return this.post<StudentGroup>('/protected/student-groups', group);
  }

  // Actualizar un grupo existente
  updateGroup(uuid: string, group: StudentGroupRequest): Observable<any> {
    return this.patch<StudentGroup>(`/protected/student-groups/${uuid}`, group);
  }

  // Eliminar un grupo
  deleteGroup(uuid: string): Observable<any> {
    return this.delete<void>(`/protected/student-groups/${uuid}`);
  }

  // Obtener todas las carreras con sus ciclos
  getAllCareers(): Observable<any> {
    return this.get<Career[]>('/protected/career');
  }

  // Obtener modalidades educativas
  getAllModalities(): Observable<any> {
    return this.get<any[]>('/protected/educational-modalities');
  }
}
