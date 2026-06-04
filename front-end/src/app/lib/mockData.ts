import type {
  Exercise,
  ExerciseBaseline,
  ProgressInsights,
  WorkoutSession,
  UserProfile,
  DailyCheckIn,
} from "../types/workout";
import googleCalendar from "./googleCalendar";
import { sinasAgent } from "./sinasAgent";

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
let cachedSessions: WorkoutSession[] = [];
let cachedProfile: UserProfile = {
  id: "",
  name: "",
  goal: "strength",
  experienceLevel: "beginner",
  availableDays: [],
  preferences: {},
};
let cachedCheckIns: DailyCheckIn[] = [];
let cachedProgressInsights: ProgressInsights = {
  strengthData: [],
  volumeData: [],
  sleepData: [],
  achievements: [],
  personalRecords: [],
  sleepInsight: undefined,
};

const WORKOUT_CACHE_KEY_PREFIX = "gymtracker_workout_sessions_v1";
const BASELINE_CACHE_KEY_PREFIX = "gymtracker_exercise_baselines_v1";
const DEFAULT_ENV_USER_ID =
  (import.meta.env.VITE_SINAS_USER_ID as string | undefined)?.trim() || "demo-user";

function readSessionsFromKey(key: string): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkoutSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getWorkoutCacheKey() {
  return `${WORKOUT_CACHE_KEY_PREFIX}:${sinasAgent.getActiveUserId()}`;
}

function getBaselineCacheKey() {
  return `${BASELINE_CACHE_KEY_PREFIX}:${sinasAgent.getActiveUserId()}`;
}

function saveWorkoutSessionsToLocalCache(sessions: WorkoutSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getWorkoutCacheKey(), JSON.stringify(sessions));
  } catch {
    // Ignore storage failures
  }
}

function loadWorkoutSessionsFromLocalCache(): WorkoutSession[] {
  const primary = readSessionsFromKey(getWorkoutCacheKey());
  if (primary.length > 0) return primary;

  // Fallbacks for older cache keys and earlier account-id mappings.
  const envUserKey = `${WORKOUT_CACHE_KEY_PREFIX}:${DEFAULT_ENV_USER_ID}`;
  const legacyUnscopedKey = WORKOUT_CACHE_KEY_PREFIX;

  const envUserCached = readSessionsFromKey(envUserKey);
  if (envUserCached.length > 0) return envUserCached;

  return readSessionsFromKey(legacyUnscopedKey);
}

function sanitizeBaseline(value: ExerciseBaseline): ExerciseBaseline {
  const cleanNumber = (num: unknown) => {
    if (typeof num !== "number" || !Number.isFinite(num)) return undefined;
    if (num <= 0) return undefined;
    return Math.round(num * 100) / 100;
  };

  return {
    exerciseId: value.exerciseId,
    exerciseName: value.exerciseName,
    sets: cleanNumber(value.sets),
    reps: cleanNumber(value.reps),
    weight: cleanNumber(value.weight),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function loadExerciseBaselinesFromLocalCache(): ExerciseBaseline[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getBaselineCacheKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExerciseBaseline[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => sanitizeBaseline(entry))
      .filter((entry) => entry.sets || entry.reps || entry.weight);
  } catch {
    return [];
  }
}

function saveExerciseBaselinesToLocalCache(items: ExerciseBaseline[]) {
  if (typeof window === "undefined") return;
  try {
    const sanitized = items
      .map((entry) => sanitizeBaseline(entry))
      .filter((entry) => entry.sets || entry.reps || entry.weight);
    window.localStorage.setItem(getBaselineCacheKey(), JSON.stringify(sanitized));
  } catch {
    // Ignore storage failures
  }
}

function preferExistingSessionsWhenEmpty(incoming: WorkoutSession[]) {
  if (incoming.length > 0) return incoming;
  if (cachedSessions.length > 0) return cachedSessions;

  const persisted = loadWorkoutSessionsFromLocalCache();
  if (persisted.length > 0) return persisted;

  return incoming;
}

function syncSessionCaches(sessions: WorkoutSession[]) {
  cachedSessions = sessions;
  if (sessions.length > 0) {
    saveWorkoutSessionsToLocalCache(sessions);
  }
}

function ensureSinasConfigured() {
  if (!sinasAgent.isConfigured()) {
    throw new Error("SINAS is not configured. Set VITE_SINAS_BASE_URL and VITE_SINAS_API_KEY.");
  }
}

function sessionSignature(sessions: WorkoutSession[]) {
  return JSON.stringify(
    sessions.map((session) => ({
      date: session.date,
      name: session.name,
      exercises: session.exercises.map((exercise) => ({
        name: exercise.exercise.name,
        sets: exercise.sets.map((set) => ({ reps: set.reps, weight: set.weight })),
      })),
    })),
  );
}

export const api = {
  // Workout sessions
  getWorkoutSessions: async (): Promise<WorkoutSession[]> => {
    ensureSinasConfigured();
    try {
      const sessions = await sinasAgent.getWorkoutSessions();
      const stableSessions = preferExistingSessionsWhenEmpty(sessions);
      syncSessionCaches(stableSessions);
      return cachedSessions;
    } catch (error) {
      console.warn("SINAS getWorkoutSessions failed", error);
      const stableSessions = preferExistingSessionsWhenEmpty([]);
      if (stableSessions.length > 0) {
        syncSessionCaches(stableSessions);
        return stableSessions;
      }
      throw error;
    }
  },

  generateWorkoutPlan: async (options?: { goal?: UserProfile["goal"] }): Promise<WorkoutSession[]> => {
    ensureSinasConfigured();
    const desiredGoal = options?.goal ?? cachedProfile.goal;
    const previousSignature = sessionSignature(cachedSessions);
    const baselines = loadExerciseBaselinesFromLocalCache();

    try {
      const sessions = await sinasAgent.generateWorkoutPlan({
        goal: desiredGoal,
        workoutHistory: baselines.map((item) => ({
          exercise: item.exerciseName,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight,
        })),
        preferredExercises: baselines.map((item) => item.exerciseName),
        requestId: `regen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      if (!sessions.length) {
        throw new Error("SINAS returned no sessions for generated plan");
      }

      const incomingSignature = sessionSignature(sessions);
      if (incomingSignature === previousSignature) {
        console.warn("SINAS returned unchanged schedule on regeneration request");
      }
      cachedSessions = sessions;
      saveWorkoutSessionsToLocalCache(cachedSessions);
      return cachedSessions;
    } catch (error) {
      console.warn("SINAS generateWorkoutPlan failed", error);
      throw error;
    }
  },

  updateWorkoutSet: async (
    sessionId: string,
    exerciseId: string,
    setId: string,
    data: Partial<WorkoutSession["exercises"][number]["sets"][number]>,
  ) => {
    ensureSinasConfigured();
    cachedSessions = cachedSessions.map((session) => {
      if (session.id !== sessionId) return session;
      return {
        ...session,
        exercises: session.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          return {
            ...exercise,
            sets: exercise.sets.map((set) =>
              set.id === setId
                ? {
                    ...set,
                    ...data,
                  }
                : set,
            ),
          };
        }),
      };
    });

    try {
      const response = await sinasAgent.updateWorkoutSet(sessionId, exerciseId, setId, data);
      saveWorkoutSessionsToLocalCache(cachedSessions);
      return response;
    } catch (error) {
      console.warn("SINAS updateWorkoutSet failed", error);
      saveWorkoutSessionsToLocalCache(cachedSessions);
      throw error;
    }
  },

  updateWorkoutStatus: async (sessionId: string, completed: boolean) => {
    ensureSinasConfigured();
    cachedSessions = cachedSessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            completed,
          }
        : session,
    );

    try {
      const response = await sinasAgent.updateWorkoutStatus(sessionId, completed);
      saveWorkoutSessionsToLocalCache(cachedSessions);
      return response;
    } catch (error) {
      console.warn("SINAS updateWorkoutStatus failed", error);
      saveWorkoutSessionsToLocalCache(cachedSessions);
      throw error;
    }
  },

  // User profile
  getUserProfile: async (): Promise<UserProfile> => {
    ensureSinasConfigured();
    try {
      const profile = await sinasAgent.getUserProfile();
      if (!profile) throw new Error("SINAS returned empty profile");
      cachedProfile = profile;
      return profile;
    } catch (error) {
      console.warn("SINAS getUserProfile failed", error);
      throw error;
    }
  },

  updateUserProfile: async (data: Partial<UserProfile>) => {
    ensureSinasConfigured();
    cachedProfile = {
      ...cachedProfile,
      ...data,
      preferences: {
        ...cachedProfile.preferences,
        ...(data.preferences ?? {}),
      },
    };

    try {
      return await sinasAgent.updateUserProfile(data);
    } catch (error) {
      console.warn("SINAS updateUserProfile failed", error);
      throw error;
    }
  },

  getExerciseBaselines: async (): Promise<ExerciseBaseline[]> => {
    return loadExerciseBaselinesFromLocalCache();
  },

  updateExerciseBaselines: async (items: ExerciseBaseline[]) => {
    saveExerciseBaselinesToLocalCache(items);
    return { success: true };
  },

  // Daily check-in
  submitDailyCheckIn: async (checkIn: DailyCheckIn) => {
    ensureSinasConfigured();
    cachedCheckIns = [checkIn, ...cachedCheckIns.filter((item) => item.date !== checkIn.date)];

    try {
      return await sinasAgent.submitDailyCheckIn(checkIn);
    } catch (error) {
      console.warn("SINAS submitDailyCheckIn failed", error);
      throw error;
    }
  },

  getDailyCheckIns: async (days: number = 30): Promise<DailyCheckIn[]> => {
    ensureSinasConfigured();
    try {
      const checkIns = await sinasAgent.getDailyCheckIns(days);
      cachedCheckIns = checkIns;
      return checkIns;
    } catch (error) {
      console.warn("SINAS getDailyCheckIns failed", error);
      throw error;
    }
  },

  getProgressInsights: async (): Promise<ProgressInsights> => {
    ensureSinasConfigured();
    try {
      const insights = await sinasAgent.getProgressInsights();
      cachedProgressInsights = insights;
      return insights;
    } catch (error) {
      console.warn("SINAS getProgressInsights failed", error);
      throw error;
    }
  },

  // Calendar integration
  syncWithGoogleCalendar: async () => {
    ensureSinasConfigured();
    try {
      if (!cachedSessions.length) {
        cachedSessions = await sinasAgent.getWorkoutSessions();
      }
      const res = await googleCalendar.insertSessionsAsEvents(cachedSessions);
      return res;
    } catch (err) {
      console.error("syncWithGoogleCalendar failed", err);
      return { success: false, error: String(err) };
    }
  },

  // External app integration
  syncWithFitnessApps: async (appName: string) => {
    ensureSinasConfigured();
    try {
      return await sinasAgent.syncWithFitnessApps(appName);
    } catch (error) {
      console.warn("SINAS syncWithFitnessApps failed", error);
      throw error;
    }
  },
};
