// src/app/shared/services/api.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.log('🌐 Interceptando petición:', req.method, req.url);

    let modifiedReq = req;

    // Solo agregar el token si la petición es a nuestra API y NO es el endpoint de login
    const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
    const isLoginRequest = req.url.includes('/auth/login');

    console.log('📝 Es petición a API:', isApiRequest);
    console.log('🔐 Es petición de login:', isLoginRequest);

    if (isApiRequest && !isLoginRequest) {
      const token = this.auth.token;
      console.log('🎫 Token obtenido:', token ? 'Token presente' : 'No hay token');

      if (token) {
        // Validar formato del token antes de enviarlo
        const parts = token.split('.');
        if (parts.length === 3) {
          modifiedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ Token agregado a la petición');
        } else {
          console.error('❌ Token tiene formato inválido, no se agrega a la petición');
          // Limpiar token inválido
          this.auth.logout();
        }
      }
    } else if (isLoginRequest) {
      console.log('🔑 Petición de login, no se agrega token');
    }

    return next.handle(modifiedReq);
  }
}
