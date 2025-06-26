// src/app/features/schedule-assignment/services/teaching-type.service.ts - CORREGIDO
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { BaseApiService } from '../../../shared/services/base-api.service';

export interface TeachingType {
  uuid: string;
  name: string; // 'THEORY' | 'PRACTICE'
}

@Injectable({
  providedIn: 'root'
})
export class TeachingTypeService extends BaseApiService {
  // ✅ CORREGIDO: underscore en lugar de asterisco
  private _types$ = new BehaviorSubject<TeachingType[]>([]);
  private loaded = false;

  /** Obtiene todos los tipos y actualiza el cache */
  getAllTeachingTypes(): Observable<TeachingType[]> {
    return this.get<TeachingType[]>('/protected/teaching-types')
      .pipe(
        map(resp => resp.data),
        tap(types => {
          this._types$.next(types); // ✅ CORREGIDO: con underscore
          this.loaded = true;
          console.log('Teaching types loaded:', types);
        }),
        shareReplay(1)
      );
  }

  /** Asegura que el cache esté cargado, y devuelve los tipos */
  ensureTypesLoaded(): Observable<TeachingType[]> {
    if (this.loaded && this._types$.value.length > 0) {
      return of(this._types$.value);
    }
    return this.getAllTeachingTypes();
  }

  /** Busca en cache el UUID de un tipo por su nombre */
  getTypeUuidByName(name: string): string | undefined {
    const result = this._types$.value.find(t => t.name === name)?.uuid;
    console.log(`Looking for type UUID for ${name}:`, result);
    return result;
  }

  /** Obtener un tipo de enseñanza por su UUID */
  getTeachingTypeById(uuid: string): Observable<TeachingType> {
    return this.get<TeachingType>(`/protected/teaching-types/${uuid}`)
      .pipe(map(resp => resp.data));
  }

  /** ✅ NUEVO: Obtiene tipos disponibles desde cache */
  getLoadedTypes(): TeachingType[] {
    return this._types$.value;
  }
}
