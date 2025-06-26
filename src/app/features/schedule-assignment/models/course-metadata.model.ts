// src/app/features/schedule-assignment/models/course-metadata.model.ts

import {ClassSessionResponse, CourseResponse} from './class-session.model';

export interface CourseMetadata {
  course: CourseResponse;
  totalRequiredHours: number;
  requiredTheoryHours: number;
  requiredPracticeHours: number;
  assignedHours: number;
  assignedTheoryHours: number;
  assignedPracticeHours: number;
  remainingHours: number;
  remainingTheoryHours: number;
  remainingPracticeHours: number;
  progressPercentage: number;
  isCompleted: boolean;
  sessionsCount: number;
  sessions: ClassSessionResponse[];
}

export interface GroupCoursesSummary {
  groupUuid: string;
  groupName: string;
  cycleNumber: number;
  careerName: string;
  totalCourses: number;
  completedCourses: number;
  totalRequiredHours: number;
  totalAssignedHours: number;
  totalRemainingHours: number;
  overallProgress: number;
  courses: CourseMetadata[];
  lastUpdated: Date;
}

export interface CourseAssignmentStats {
  totalTheoryHours: number;
  totalPracticeHours: number;
  assignedTheoryHours: number;
  assignedPracticeHours: number;
  remainingTheoryHours: number;
  remainingPracticeHours: number;
  completionPercentage: number;
}
