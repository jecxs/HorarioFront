// src/app/shared/models/auth.models.ts
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  // otros datos si aplica (userId, roles…)
}
