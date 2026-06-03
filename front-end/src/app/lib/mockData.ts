import type {
  Exercise,
  WorkoutSession,
  UserProfile,
  DailyCheckIn,
} from "../types/workout";
import googleCalendar from "./googleCalendar";

// Mock exercises database
export const exercises: Exercise[] = [
  { id: "1", name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell" },
  { id: "2", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell" },
  { id: "3", name: "Deadlift", muscleGroup: "Back", equipment: "Barbell" },
  {
    id: "4",
    name: "Overhead Press",
    muscleGroup: "Shoulders",
    equipment: "Barbell",
  },
  { id: "5", name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell" },
  { id: "6", name: "Pull-ups", muscleGroup: "Back", equipment: "Bodyweight" },
  { id: "7", name: "Dips", muscleGroup: "Chest", equipment: "Bodyweight" },
  {
    id: "8",
    name: "Romanian Deadlift",
    muscleGroup: "Legs",
    equipment: "Barbell",
  },
  { id: "9", name: "Lunges", muscleGroup: "Legs", equipment: "Dumbbell" },
  {
    id: "10",
    name: "Face Pulls",
    muscleGroup: "Shoulders",
    equipment: "Cable",
  },
];

// Mock user profile
export const mockUserProfile: UserProfile = {
  id: "1",
  name: "Jan Jansen",
  goal: "strength",
  experienceLevel: "intermediate",
  availableDays: [1, 3, 5], // Maandag, Woensdag, Vrijdag
  preferences: {
    preferredTime: "18:00",
    excludedExercises: [],
  },
};

// Mock workout sessions
export const mockWorkoutSessions: WorkoutSession[] = [
  {
    id: "1",
    date: "2026-06-02",
    name: "Upper Body Strength",
    completed: false,
    exercises: [
      {
        id: "we1",
        exercise: exercises[1], // Bench Press
        order: 1,
        restTime: 180,
        sets: [
          { id: "s1", weight: 80, reps: 5, difficulty: 3, completed: false },
          { id: "s2", weight: 80, reps: 5, difficulty: 3, completed: false },
          { id: "s3", weight: 80, reps: 5, difficulty: 3, completed: false },
        ],
      },
      {
        id: "we2",
        exercise: exercises[3], // Overhead Press
        order: 2,
        restTime: 120,
        sets: [
          { id: "s4", weight: 50, reps: 8, difficulty: 3, completed: false },
          { id: "s5", weight: 50, reps: 8, difficulty: 3, completed: false },
          { id: "s6", weight: 50, reps: 8, difficulty: 3, completed: false },
        ],
      },
      {
        id: "we3",
        exercise: exercises[5], // Pull-ups
        order: 3,
        restTime: 90,
        sets: [
          { id: "s7", weight: 0, reps: 10, difficulty: 3, completed: false },
          { id: "s8", weight: 0, reps: 10, difficulty: 3, completed: false },
          { id: "s9", weight: 0, reps: 10, difficulty: 3, completed: false },
        ],
      },
    ],
  },
  {
    id: "2",
    date: "2026-06-04",
    name: "Lower Body Strength",
    completed: false,
    exercises: [
      {
        id: "we4",
        exercise: exercises[0], // Squat
        order: 1,
        restTime: 180,
        sets: [
          { id: "s10", weight: 100, reps: 5, difficulty: 3, completed: false },
          { id: "s11", weight: 100, reps: 5, difficulty: 3, completed: false },
          { id: "s12", weight: 100, reps: 5, difficulty: 3, completed: false },
        ],
      },
      {
        id: "we5",
        exercise: exercises[2], // Deadlift
        order: 2,
        restTime: 180,
        sets: [
          { id: "s13", weight: 120, reps: 5, difficulty: 3, completed: false },
          { id: "s14", weight: 120, reps: 5, difficulty: 3, completed: false },
        ],
      },
    ],
  },
];

// Mock daily check-ins
export const mockDailyCheckIns: DailyCheckIn[] = [
  {
    date: "2026-06-01",
    sleep: { date: "2026-06-01", hours: 7.5, quality: 4 },
    steps: 8500,
    mood: 4,
  },
  {
    date: "2026-05-31",
    sleep: { date: "2026-05-31", hours: 6.5, quality: 3 },
    steps: 5200,
    mood: 3,
  },
];

// Mock API functies voor backend integratie
export const api = {
  // Workout sessions
  getWorkoutSessions: async (): Promise<WorkoutSession[]> => {
    // TODO: Vervang met echte API call
    return Promise.resolve(mockWorkoutSessions);
  },

  updateWorkoutSet: async (
    sessionId: string,
    exerciseId: string,
    setId: string,
    data: Partial<(typeof mockWorkoutSessions)[0]["exercises"][0]["sets"][0]>,
  ) => {
    // TODO: Vervang met echte API call
    return Promise.resolve({ success: true, data });
  },

  // User profile
  getUserProfile: async (): Promise<UserProfile> => {
    // TODO: Vervang met echte API call
    return Promise.resolve(mockUserProfile);
  },

  updateUserProfile: async (data: Partial<UserProfile>) => {
    // TODO: Vervang met echte API call
    return Promise.resolve({ success: true, data });
  },

  // Daily check-in
  submitDailyCheckIn: async (checkIn: DailyCheckIn) => {
    // TODO: Vervang met echte API call
    return Promise.resolve({ success: true, data: checkIn });
  },

  getDailyCheckIns: async (days: number = 30): Promise<DailyCheckIn[]> => {
    // TODO: Vervang met echte API call
    return Promise.resolve(mockDailyCheckIns);
  },

  // Calendar integration
  syncWithGoogleCalendar: async () => {
    try {
      const res =
        await googleCalendar.insertSessionsAsEvents(mockWorkoutSessions);
      return res;
    } catch (err) {
      console.error("syncWithGoogleCalendar failed", err);
      return { success: false, error: String(err) };
    }
  },

  // External app integration
  syncWithFitnessApps: async (appName: string) => {
    // TODO: Implementeer app-specifieke sync
    return Promise.resolve({ success: true });
  },
};
