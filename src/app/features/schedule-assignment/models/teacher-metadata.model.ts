// src/app/features/schedule-assignment/models/teacher-metadata.model.ts
import { TeacherResponse, ClassSessionResponse, DayOfWeek } from './class-session.model';

export interface TeacherScheduleMetadata {
  teacher: TeacherResponse;
  totalAssignedHours: number;
  totalSessions: number;
  sessionsByDay: { [day in DayOfWeek]?: ClassSessionResponse[] };
  workloadPercentage: number;
  availabilityHours: number;
  utilizationRate: number;
  lastUpdated: Date;
}

export interface TeacherAssignmentStats {
  totalAvailableHours: number;
  totalAssignedHours: number;
  utilizationPercentage: number;
  sessionsByType: {
    theory: number;
    practice: number;
  };
  hoursByType: {
    theory: number;
    practice: number;
  };
}

export interface TeacherWorkloadAnalysis {
  teacherUuid: string;
  teacherName: string;
  totalHours: number;
  workloadLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
  recommendations: string[];
  distributionByDay: { [day in DayOfWeek]?: number };
  sessionTypes: { theory: number; practice: number };
}

export interface TeacherAvailabilitySlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isOccupied: boolean;
  sessionInfo?: {
    courseName: string;
    groupName: string;
    spaceTitle: string;
  };
}
