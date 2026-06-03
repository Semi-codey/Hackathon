// Types voor backend integratie
export type WorkoutGoal = 'strength' | 'hypertrophy' | 'endurance' | 'crossfit' | 'powerlifting';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  videoUrl?: string;
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = zeer makkelijk, 5 = zeer zwaar
  rpe?: number; // Rate of Perceived Exertion (optioneel)
  completed: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  restTime: number; // in seconds
  order: number;
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  duration?: number; // in minutes
  completed: boolean;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  goal: WorkoutGoal;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  availableDays: number[];
  preferences: {
    preferredTime?: string;
    excludedExercises?: string[];
  };
}

export interface SleepData {
  date: string;
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
}

export interface DailyCheckIn {
  date: string;
  sleep: SleepData;
  steps?: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

// API response types voor backend integratie
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface CalendarIntegration {
  enabled: boolean;
  calendarId?: string;
  autoSchedule: boolean;
}

export interface AppIntegration {
  name: string;
  enabled: boolean;
  syncData: string[];
}
