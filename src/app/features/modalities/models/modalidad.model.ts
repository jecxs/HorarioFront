export interface EducationalModalityRequest {
  name: string;
  durationYears: number;
  description?: string;
}

export interface EducationalModalityResponse {
  uuid: string;
  name: string;
  durationYears: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
