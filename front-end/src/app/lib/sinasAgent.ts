import type { DailyCheckIn, ProgressInsights, UserProfile, WorkoutSession } from "../types/workout";

const SINAS_BASE_URL = (import.meta.env.VITE_SINAS_BASE_URL as string | undefined)?.trim();
const SINAS_API_KEY = (import.meta.env.VITE_SINAS_API_KEY as string | undefined)?.trim();
const SINAS_ENDPOINT =
  (import.meta.env.VITE_SINAS_ENDPOINT as string | undefined)?.trim() || "";
const SINAS_ENABLE_DIRECT_TASK_ENDPOINTS =
  String(import.meta.env.VITE_SINAS_ENABLE_DIRECT_TASK_ENDPOINTS ?? "false").toLowerCase() ===
  "true";
const SINAS_USER_ID =
  (import.meta.env.VITE_SINAS_USER_ID as string | undefined)?.trim() || "demo-user";
const SINAS_ACTIVE_USER_ID_KEY = "sinas_active_user_id";
const SINAS_AGENT_NAMESPACE =
  (import.meta.env.VITE_SINAS_AGENT_NAMESPACE as string | undefined)?.trim();
const SINAS_AGENT_NAME =
  (import.meta.env.VITE_SINAS_AGENT_NAME as string | undefined)?.trim();

type AgentTask =
  | "get_workout_sessions"
  | "update_workout_set"
  | "get_user_profile"
  | "update_user_profile"
  | "submit_daily_check_in"
  | "get_daily_check_ins"
  | "sync_fitness_app"
  | "generate_workout_plan"
  | "generate_schedule"
  | "create_workout_plan"
  | "get_progress_insights";

type AgentRunInput = {
  task: AgentTask;
  input?: unknown;
};

type SinasDebugInfo = {
  timestamp: string;
  task: AgentTask | "unknown";
  mode?: "direct" | "runtime-chat";
  attemptedUrls?: string[];
  directUrl?: string;
  runtimeBase?: string;
  runtimeAgent?: { namespace: string; name: string };
  chatId?: string;
  requestSummary?: unknown;
  responsePreview?: unknown;
  error?: string;
};

let lastSinasDebug: SinasDebugInfo = {
  timestamp: new Date().toISOString(),
  task: "unknown",
};

function setLastSinasDebug(update: Partial<SinasDebugInfo>) {
  lastSinasDebug = {
    ...lastSinasDebug,
    ...update,
    timestamp: new Date().toISOString(),
  };
}

function getActiveUserId() {
  if (typeof window !== "undefined") {
    const localUserId = window.localStorage.getItem(SINAS_ACTIVE_USER_ID_KEY)?.trim();
    if (localUserId) return localUserId;
  }
  return SINAS_USER_ID;
}

function setActiveUserId(userId: string) {
  const value = userId.trim();
  if (!value) return;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SINAS_ACTIVE_USER_ID_KEY, value);
  }
}

const DB_CONTEXT = {
  schema: "public",
  tables: {
    workout: [
      "workout_id",
      "program_id",
      "user_id",
      "planned_date",
      "planned_time",
      "duration",
      "name",
      "intensity",
      "status",
    ],
    workout_exercise: [
      "workout_exercise_id",
      "workout_id",
      "exercise_id",
      "order_number",
      "target_sets",
      "target_reps",
      "target_weight",
      "rest_interval",
      "notes",
    ],
    setlog: [
      "setlog_id",
      "workout_exercise_id",
      "set_number",
      "reps",
      "weight",
      "intensity",
      "executed_at",
      "notes",
    ],
    checkin: [
      "checkin_id",
      "user_id",
      "date",
      "sleep_hours",
      "sleep_quality",
      "steps",
      "mood",
      "details",
    ],
    profile: ["profile_id", "user_id", "experience_level", "standard_unit", "training_style"],
    user: ["uuid", "first_name", "last_name", "email", "gender", "date_birth"],
    program: ["program_id", "user_id", "name", "goal_type", "duration", "active"],
    target: ["target_id", "user_id", "target_type", "description", "active"],
    exercise: ["exercise_id", "name", "muscle_group", "standard_unit", "technique_tips"],
    measurement: ["measurement_id", "user_id", "date", "weight_kg", "bmi", "notes"],
    pr_history: ["pr_id", "user_id", "exercise_id", "metric", "value", "date", "standard_unit"],
  },
} as const;

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function normalizeSinasRuntimeBase(url: string) {
  try {
    const parsed = new URL(url);
    const hasLikelyUiPort = parsed.port === "51245";
    const hasApiPath = /\/api(\/v\d+)?\/?$/i.test(parsed.pathname);

    if (hasLikelyUiPort || hasApiPath) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }

    return stripTrailingSlash(url);
  } catch {
    return stripTrailingSlash(url);
  }
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsedFenced = safeJsonParse<unknown>(fenced[1].trim());
    if (parsedFenced !== null) return parsedFenced;
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonSlice = text.slice(firstBrace, lastBrace + 1);
    const parsedSlice = safeJsonParse<unknown>(jsonSlice);
    if (parsedSlice !== null) return parsedSlice;
  }

  return safeJsonParse<unknown>(text);
}

function extractUsefulPayload(payload: unknown): unknown {
  if (payload == null) return payload;

  if (typeof payload === "string") {
    const parsed = extractJsonBlock(payload);
    return parsed ?? payload;
  }

  if (typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.data) || typeof record.data === "object") {
    return record.data;
  }

  for (const key of [
    "result",
    "output",
    "response",
    "payload",
    "content",
    "message",
  ]) {
    const value = record[key];
    if (value !== undefined) return extractUsefulPayload(value);
  }

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    const content = message?.content ?? first.text;
    if (content !== undefined) return extractUsefulPayload(content);
  }

  return payload;
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  const parsed = safeJsonParse<unknown>(text);
  if (parsed !== null) return parsed;
  return text;
}

function buildCandidateUrls() {
  if (!SINAS_BASE_URL) return [];
  const base = stripTrailingSlash(SINAS_BASE_URL);

  // Default behavior: use runtime chat only (avoids predictable 404 noise on deployments
  // that do not expose /run-style task endpoints).
  if (!SINAS_ENABLE_DIRECT_TASK_ENDPOINTS && !SINAS_ENDPOINT) {
    return [];
  }

  const explicit = SINAS_ENDPOINT
    ? SINAS_ENDPOINT.startsWith("/")
      ? `${base}${SINAS_ENDPOINT}`
      : `${base}/${SINAS_ENDPOINT}`
    : "";

  // If direct endpoints are explicitly enabled, keep a minimal set.
  if (SINAS_ENABLE_DIRECT_TASK_ENDPOINTS) {
    return [explicit, `${base}/agent/run`, `${base}/run`, `${base}`].filter(
      (url, index, arr) => Boolean(url) && arr.indexOf(url) === index,
    );
  }

  // If only explicit endpoint is configured, try only that one.
  return explicit ? [explicit] : [];
}

function getRuntimeBaseUrl() {
  if (!SINAS_BASE_URL) throw new Error("SINAS is not configured");
  return normalizeSinasRuntimeBase(SINAS_BASE_URL);
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(SINAS_API_KEY ? { Authorization: `Bearer ${SINAS_API_KEY}` } : {}),
      ...(SINAS_API_KEY ? { "x-api-key": SINAS_API_KEY } : {}),
      ...(init.headers ?? {}),
    },
  });
  const parsed = await parseResponse(res);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} at ${url}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

type RuntimeAgent = {
  namespace: string;
  name: string;
  is_default?: boolean;
  is_active?: boolean;
};

async function resolveRuntimeAgent(): Promise<RuntimeAgent> {
  if (SINAS_AGENT_NAMESPACE && SINAS_AGENT_NAME) {
    return {
      namespace: SINAS_AGENT_NAMESPACE,
      name: SINAS_AGENT_NAME,
    };
  }

  const runtimeBase = getRuntimeBaseUrl();
  const agents = (await fetchJson(`${runtimeBase}/agents`, {
    method: "GET",
  })) as unknown[];

  const typedAgents = Array.isArray(agents)
    ? agents.map((agent) => {
        const item = asRecord(agent);
        return {
          namespace: String(item.namespace ?? ""),
          name: String(item.name ?? ""),
          is_default: Boolean(item.is_default),
          is_active: item.is_active === undefined ? true : Boolean(item.is_active),
        } satisfies RuntimeAgent;
      })
    : [];

  const selected =
    typedAgents.find((agent) => agent.is_default && agent.is_active) ??
    typedAgents.find((agent) => agent.is_active) ??
    typedAgents[0];

  if (!selected?.namespace || !selected?.name) {
    throw new Error("No active SINAS agents found");
  }

  return selected;
}

async function runAgentViaRuntimeChat(input: AgentRunInput): Promise<unknown> {
  const runtimeBase = getRuntimeBaseUrl();
  const agent = await resolveRuntimeAgent();

  setLastSinasDebug({
    task: input.task,
    mode: "runtime-chat",
    runtimeBase,
    runtimeAgent: { namespace: agent.namespace, name: agent.name },
    directUrl: undefined,
    error: undefined,
    responsePreview: undefined,
    chatId: undefined,
    requestSummary: {
      task: input.task,
      user_id: getActiveUserId(),
      input: input.input ?? {},
    },
  });

  const created = asRecord(
    await fetchJson(
      `${runtimeBase}/agents/${encodeURIComponent(agent.namespace)}/${encodeURIComponent(agent.name)}/chats`,
      {
        method: "POST",
        body: JSON.stringify({
          title: `frontend-${input.task}-${new Date().toISOString()}`,
        }),
      },
    ),
  );

  const chatId = String(created.id ?? "");
  if (!chatId) {
    setLastSinasDebug({
      error: "Could not create SINAS chat session",
      responsePreview: created,
    });
    throw new Error("Could not create SINAS chat session");
  }

  setLastSinasDebug({ chatId });

  const prompt = {
    instruction:
      "Execute the task against real data. Return ONLY valid JSON. Do not include explanations, schema descriptions, markdown, or code fences.",
    task: input.task,
    user_id: getActiveUserId(),
    db_context: DB_CONTEXT,
    input: input.input ?? {},
    response_contract: {
      allowed_wrappers: ["data", "result", "output", "sessions", "workouts"],
      no_markdown: true,
      strict_json_only: true,
      for_task: input.task,
      expected_shape:
        input.task === "get_workout_sessions"
          ? {
              sessions: [
                {
                  workout_id: "",
                  user_id: getActiveUserId(),
                  name: "",
                  planned_date: "YYYY-MM-DD",
                  status: "planned",
                  workout_exercises: [],
                },
              ],
            }
          : undefined,
    },
  };

  const message = asRecord(
    await fetchJson(`${runtimeBase}/chats/${encodeURIComponent(chatId)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        role: "user",
        content: JSON.stringify(prompt),
      }),
    }),
  );

  setLastSinasDebug({
    error: undefined,
    responsePreview: {
      role: message.role,
      content:
        typeof message.content === "string"
          ? message.content.slice(0, 1200)
          : message.content,
    },
  });

  return extractUsefulPayload(message.content ?? message.data ?? message.result ?? message);
}

function isSchemaOnlyPayload(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const hasSchemaMarkers =
    Boolean(root.schema_resolved) ||
    Boolean(data.schema_resolved) ||
    Boolean(root.table_map) ||
    Boolean(data.table_map);

  if (!hasSchemaMarkers) return false;

  const sessions = normalizeSessionsFromPayload(payload);
  return sessions.length === 0;
}

async function runAgentRequest(input: AgentRunInput): Promise<unknown> {
  const urls = buildCandidateUrls();
  if (!SINAS_BASE_URL) throw new Error("SINAS is not configured");

  if (!urls.length) {
    return await runAgentViaRuntimeChat(input);
  }

  setLastSinasDebug({
    task: input.task,
    mode: "direct",
    attemptedUrls: urls,
    requestSummary: {
      task: input.task,
      userId: getActiveUserId(),
      input: input.input ?? {},
    },
    error: undefined,
    responsePreview: undefined,
    directUrl: undefined,
    runtimeBase: undefined,
    runtimeAgent: undefined,
    chatId: undefined,
  });

  const body = {
    task: input.task,
    input: input.input ?? {},
    userId: getActiveUserId(),
    dbContext: DB_CONTEXT,
    source: "gymtracker-frontend",
    timestamp: new Date().toISOString(),
  };

  let lastError = "Unknown request error";

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SINAS_API_KEY ? { Authorization: `Bearer ${SINAS_API_KEY}` } : {}),
          ...(SINAS_API_KEY ? { "x-api-key": SINAS_API_KEY } : {}),
        },
        body: JSON.stringify(body),
      });

      const parsed = await parseResponse(res);
      if (!res.ok) {
        lastError = `${res.status} ${res.statusText} at ${url}: ${JSON.stringify(parsed)}`;
        setLastSinasDebug({
          directUrl: url,
          error: lastError,
          responsePreview: parsed,
        });
        continue;
      }

      setLastSinasDebug({
        directUrl: url,
        error: undefined,
        responsePreview: parsed,
      });

      return extractUsefulPayload(parsed);
    } catch (error) {
      lastError = String(error);
      setLastSinasDebug({
        directUrl: url,
        error: lastError,
      });
    }
  }

  try {
    return await runAgentViaRuntimeChat(input);
  } catch (runtimeError) {
    setLastSinasDebug({
      error: `Direct failed: ${lastError}. Runtime chat failed: ${String(runtimeError)}`,
    });
    throw new Error(
      `All SINAS task endpoints failed (${lastError}). Runtime chat fallback failed: ${String(runtimeError)}`,
    );
  }
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate =
      record.sessions ?? record.workouts ?? record.schedule ?? record.items ?? record.data;
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function toDateOnly(value: unknown, fallbackOffsetDays = 0) {
  if (typeof value === "string" && value.trim()) {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().split("T")[0];
    return value.slice(0, 10);
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackOffsetDays);
  return fallback.toISOString().split("T")[0];
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asDifficulty(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const num = Math.round(asNumber(value, 3));
  if (num < 1) return 1;
  if (num > 5) return 5;
  return num as 1 | 2 | 3 | 4 | 5;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function pickArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [] as unknown[];
}

function toMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Math.round(Number(trimmed)));
  }

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3] ?? "0");
    return Math.max(0, Math.round(hours * 60 + minutes + seconds / 60));
  }

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  return undefined;
}

function mapWorkoutStatusToCompleted(status: unknown, completed: unknown) {
  if (typeof completed === "boolean") return completed;
  if (typeof status !== "string") return false;
  const normalized = status.trim().toLowerCase();
  return ["done", "completed", "finished", "executed", "closed"].includes(normalized);
}

function mapGoal(value: unknown): UserProfile["goal"] {
  if (typeof value !== "string") return "strength";
  const normalized = value.trim().toLowerCase();
  if (["strength", "kracht", "power"].includes(normalized)) return "strength";
  if (["hypertrophy", "muscle", "spiergroei"].includes(normalized)) return "hypertrophy";
  if (["endurance", "cardio", "uithoudingsvermogen"].includes(normalized)) return "endurance";
  if (["crossfit"].includes(normalized)) return "crossfit";
  if (["powerlifting", "power_lifting"].includes(normalized)) return "powerlifting";
  return "strength";
}

function mapExperienceLevel(value: unknown): UserProfile["experienceLevel"] {
  if (typeof value !== "string") return "beginner";
  const normalized = value.trim().toLowerCase();
  if (["advanced", "gevorderd", "pro"].includes(normalized)) return "advanced";
  if (["intermediate", "gemiddeld", "mid"].includes(normalized)) return "intermediate";
  return "beginner";
}

function mapMoodToScale(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return asDifficulty(value);
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (["awful", "bad", "low", "sad", "tired", "😫", "😞"].includes(normalized)) return 1;
  if (["meh", "down", "😕"].includes(normalized)) return 2;
  if (["ok", "neutral", "😐"].includes(normalized)) return 3;
  if (["good", "great", "🙂"].includes(normalized)) return 4;
  if (["excellent", "amazing", "happy", "😄", "🔥"].includes(normalized)) return 5;

  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) return asDifficulty(parsed);
  return undefined;
}

function deriveSetDefaults(exercise: Record<string, unknown>) {
  const targetSets = Math.max(1, Math.round(asNumber(exercise.target_sets ?? exercise.targetSets, 3)));
  const targetReps = Math.max(1, Math.round(asNumber(exercise.target_reps ?? exercise.targetReps, 8)));
  const targetWeight = Math.max(0, asNumber(exercise.target_weight ?? exercise.targetWeight, 0));

  return Array.from({ length: targetSets }).map((_, setIndex) => ({
    id: `target-set-${setIndex + 1}`,
    weight: targetWeight,
    reps: targetReps,
    difficulty: 3 as const,
    completed: false,
  }));
}

function normalizeSession(raw: unknown, sessionIndex: number): WorkoutSession {
  const source = asRecord(raw);
  const exercisesRaw = pickArray(source, [
    "exercises",
    "workout_exercises",
    "workout_exercise",
    "items",
  ]);

  const durationMinutes =
    toMinutes(source.duration_minutes) ??
    toMinutes(source.duration) ??
    toMinutes(source.program_duration) ??
    undefined;

  return {
    id: String(source.workout_id ?? source.id ?? source.sessionId ?? `session-${sessionIndex + 1}`),
    date: toDateOnly(source.planned_date ?? source.date ?? source.planned_time, sessionIndex),
    name: String(source.name ?? source.title ?? `Workout ${sessionIndex + 1}`),
    completed: mapWorkoutStatusToCompleted(source.status, source.completed),
    duration: durationMinutes,
    notes:
      typeof source.notes === "string"
        ? source.notes
        : typeof source.description === "string"
          ? source.description
          : undefined,
    exercises: exercisesRaw.map((exerciseRaw, exerciseIndex) => {
      const exercise = asRecord(exerciseRaw);
      const nestedExercise = asRecord(exercise.exercise);
      const setsRaw = pickArray(exercise, ["sets", "setlogs", "setlog", "logs"]);

      const mappedSets = setsRaw.length
        ? setsRaw
            .map((setRaw, setIndex) => {
              const set = asRecord(setRaw);
              return {
                id: String(
                  set.setlog_id ??
                    set.id ??
                    `set-${sessionIndex + 1}-${exerciseIndex + 1}-${setIndex + 1}`,
                ),
                setNumber: Math.max(1, Math.round(asNumber(set.set_number ?? set.setNumber, setIndex + 1))),
                weight: Math.max(0, asNumber(set.weight ?? exercise.target_weight ?? exercise.targetWeight, 0)),
                reps: Math.max(1, Math.round(asNumber(set.reps ?? exercise.target_reps ?? exercise.targetReps, 8))),
                difficulty: asDifficulty(set.intensity ?? set.difficulty),
                completed: Boolean(set.completed ?? set.executed_at),
                rpe: set.rpe === undefined ? undefined : asNumber(set.rpe, 0),
                notes:
                  typeof set.notes === "string"
                    ? set.notes
                    : typeof set.comment === "string"
                      ? set.comment
                      : undefined,
              };
            })
            .sort((a, b) => a.setNumber - b.setNumber)
        : deriveSetDefaults(exercise).map((set, setIndex) => ({
            ...set,
            id: `set-${sessionIndex + 1}-${exerciseIndex + 1}-${setIndex + 1}`,
            setNumber: setIndex + 1,
            notes: undefined,
            rpe: undefined,
          }));

      return {
        id: String(
          exercise.workout_exercise_id ?? exercise.id ?? `we-${sessionIndex + 1}-${exerciseIndex + 1}`,
        ),
        order: Math.max(
          1,
          Math.round(asNumber(exercise.order_number ?? exercise.order, exerciseIndex + 1)),
        ),
        restTime: Math.max(
          30,
          Math.round(asNumber(exercise.rest_interval ?? exercise.restTime, 90)),
        ),
        exercise: {
          id: String(
            nestedExercise.exercise_id ??
              nestedExercise.id ??
              exercise.exercise_id ??
              exercise.exerciseId ??
              `ex-${sessionIndex + 1}-${exerciseIndex + 1}`,
          ),
          name: String(
            nestedExercise.name ??
              exercise.exercise_name ??
              exercise.name ??
              `Exercise ${exerciseIndex + 1}`,
          ),
          muscleGroup: String(
            nestedExercise.muscle_group ??
              nestedExercise.muscleGroup ??
              exercise.muscle_group ??
              exercise.muscleGroup ??
              "Full Body",
          ),
          equipment:
            typeof nestedExercise.equipment === "string"
              ? (nestedExercise.equipment as string)
              : typeof exercise.equipment === "string"
                ? exercise.equipment
                : undefined,
          videoUrl:
            typeof nestedExercise.video_url === "string"
              ? (nestedExercise.video_url as string)
              : typeof nestedExercise.videoUrl === "string"
                ? (nestedExercise.videoUrl as string)
              : typeof exercise.videoUrl === "string"
                ? exercise.videoUrl
                : undefined,
        },
        sets: mappedSets.map((set) => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          difficulty: set.difficulty,
          completed: set.completed,
          rpe: set.rpe,
          notes: set.notes,
        })),
      };
    }).sort((a, b) => a.order - b.order),
  };
}

function parseRepsValue(value: unknown, fallback = 8) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      return Math.max(1, Number(match[0]));
    }
  }
  return fallback;
}

function mapUiGoalToAgentGoal(goal: UserProfile["goal"] | undefined):
  | "strength"
  | "hypertrophy"
  | "crossfit"
  | "fat_loss"
  | "endurance" {
  if (goal === "powerlifting") return "strength";
  if (goal === "crossfit") return "crossfit";
  if (goal === "endurance") return "endurance";
  if (goal === "hypertrophy") return "hypertrophy";
  return "strength";
}

function mapWorkoutPlanToSession(planRaw: unknown): WorkoutSession | null {
  const plan = asRecord(planRaw);
  const phases = pickArray(plan, ["phases"]);

  const mainPhase =
    phases
      .map((phase) => asRecord(phase))
      .find((phase) => String(phase.phase ?? "").toLowerCase() === "main_workout") ??
    phases.map((phase) => asRecord(phase)).find((phase) => pickArray(phase, ["exercises"]).length > 0);

  const directExercises = pickArray(plan, ["exercises", "workout_exercises", "items"]);
  const exercisesSource =
    pickArray(mainPhase ?? {}, ["exercises"]).length > 0
      ? pickArray(mainPhase ?? {}, ["exercises"])
      : directExercises;

  const exercises = exercisesSource
    .map((exerciseRaw, exerciseIndex) => {
      const exercise = asRecord(exerciseRaw);
      const setCount = Math.max(1, Math.round(asNumber(exercise.sets, 3)));
      const reps = parseRepsValue(exercise.reps, 8);
      const rest = Math.max(30, Math.round(asNumber(exercise.rest_seconds, 90)));

      return {
        workout_exercise_id: String(exercise.id ?? `we-plan-${exerciseIndex + 1}`),
        order_number: Math.max(1, Math.round(asNumber(exercise.order, exerciseIndex + 1))),
        rest_interval: rest,
        exercise: {
          exercise_id: String(exercise.exercise_id ?? `ex-plan-${exerciseIndex + 1}`),
          name: String(exercise.name ?? `Exercise ${exerciseIndex + 1}`),
          muscle_group: Array.isArray(exercise.muscle_groups)
            ? String(exercise.muscle_groups[0] ?? "Full Body")
            : String(exercise.muscle_group ?? "Full Body"),
          equipment: typeof exercise.equipment === "string" ? exercise.equipment : undefined,
        },
        sets: Array.from({ length: setCount }).map((_, setIndex) => ({
          setlog_id: `set-plan-${exerciseIndex + 1}-${setIndex + 1}`,
          set_number: setIndex + 1,
          reps,
          weight: asNumber(exercise.target_weight ?? exercise.weight, 0),
          intensity: asNumber(exercise.intensity_level ?? exercise.intensity, 3),
          completed: false,
          notes:
            typeof exercise.coaching_cue === "string"
              ? exercise.coaching_cue
              : typeof exercise.notes === "string"
                ? exercise.notes
                : undefined,
        })),
      };
    })
    .sort((a, b) => asNumber(a.order_number, 0) - asNumber(b.order_number, 0));

  if (!exercises.length) return null;

  const date = new Date();
  const goalType = String(plan.goal_type ?? plan.goal ?? "strength");
  const intensity = typeof plan.intensity === "string" ? plan.intensity : undefined;
  const coachFeedback =
    typeof plan.coach_feedback === "string"
      ? plan.coach_feedback
      : typeof plan.feedback === "string"
        ? plan.feedback
        : undefined;

  const outputMetadata = [
    intensity ? `Intensity: ${intensity}` : undefined,
    coachFeedback,
    typeof (mainPhase ?? {}).training_style === "string"
      ? String((mainPhase as Record<string, unknown>).training_style)
      : undefined,
  ]
    .filter(Boolean)
    .join(" • ");

  const sessionRaw = {
    workout_id: String(plan.plan_id ?? `plan-${Date.now()}`),
    planned_date: date.toISOString().split("T")[0],
    name: String(plan.name ?? `${goalType} Workout`),
    duration_minutes: asNumber(plan.available_time_minutes, 60),
    status: "planned",
    workout_exercises: exercises,
    notes: outputMetadata || undefined,
  };

  return normalizeSession(sessionRaw, 0);
}

function normalizeSessionsFromPayload(payload: unknown): WorkoutSession[] {
  const directArray = toArray(payload);
  if (directArray.length > 0) {
    return directArray.map((session, index) => normalizeSession(session, index));
  }

  const record = asRecord(payload);

  const workoutPlanRecord = asRecord(record.workout_plan ?? record.plan ?? record.generated_plan);
  const planSessions = pickArray(workoutPlanRecord, ["sessions", "workouts", "items"]);
  if (planSessions.length > 0) {
    return planSessions.map((session, index) => normalizeSession(session, index));
  }

  const workoutPlan = record.workout_plan ?? record.plan ?? record.generated_plan;
  if (workoutPlan) {
    const mapped = mapWorkoutPlanToSession(workoutPlan);
    if (mapped) return [mapped];
  }

  if (record.workout) {
    return [normalizeSession(record.workout, 0)];
  }

  return [];
}

function normalizeProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const profile = raw as Record<string, unknown>;
  const user = asRecord(profile.user);
  const program = asRecord(profile.program);
  const target = asRecord(profile.target);
  const preferences =
    profile.preferences && typeof profile.preferences === "object"
      ? (profile.preferences as Record<string, unknown>)
      : {};

  const firstName = typeof user.first_name === "string" ? user.first_name : "";
  const lastName = typeof user.last_name === "string" ? user.last_name : "";
  const derivedName = `${firstName} ${lastName}`.trim();

  const availableDaysRaw =
    profile.available_days ??
    profile.availableDays ??
    preferences.available_days ??
    preferences.availableDays;

  const preferredTimeRaw =
    profile.preferred_time ??
    preferences.preferred_time ??
    preferences.preferredTime;

  const goal = mapGoal(profile.goal ?? profile.goal_type ?? program.goal_type ?? target.target_type);
  const experienceLevel = mapExperienceLevel(profile.experience_level ?? profile.experienceLevel);

  return {
    id: String(profile.profile_id ?? profile.id ?? profile.user_id ?? user.uuid ?? getActiveUserId()),
    name: String(profile.name ?? (derivedName || "Atleet")),
    goal,
    experienceLevel,
    availableDays: Array.isArray(availableDaysRaw)
      ? availableDaysRaw
          .map((day) => Math.max(0, Math.min(6, Math.round(asNumber(day, 0)))))
          .filter((day, idx, arr) => arr.indexOf(day) === idx)
      : [1, 3, 5],
    preferences: {
      preferredTime: typeof preferredTimeRaw === "string" ? preferredTimeRaw : undefined,
      excludedExercises: (() => {
        const excluded = preferences.excluded_exercises ?? preferences.excludedExercises;
        return Array.isArray(excluded) ? excluded.map((item) => String(item)) : [];
      })(),
    },
  };
}

function normalizeCheckIn(raw: unknown, index: number): DailyCheckIn {
  const item = asRecord(raw);
  const sleep =
    item.sleep && typeof item.sleep === "object"
      ? (item.sleep as Record<string, unknown>)
      : {};

  const mood = mapMoodToScale(item.mood);

  return {
    date: toDateOnly(item.date, -index),
    sleep: {
      date: toDateOnly(sleep.date ?? item.date, -index),
      hours: Math.max(0, Math.min(24, asNumber(sleep.hours ?? item.sleep_hours, 7))),
      quality: asDifficulty(sleep.quality ?? item.sleep_quality),
    },
    steps: item.steps === undefined ? undefined : Math.max(0, Math.round(asNumber(item.steps, 0))),
    mood,
    notes:
      typeof item.notes === "string"
        ? item.notes
        : typeof item.details === "string"
          ? item.details
          : undefined,
  };
}

function mapAchievementColor(value: unknown): "yellow" | "blue" | "green" {
  if (typeof value !== "string") return "green";
  const normalized = value.trim().toLowerCase();
  if (["yellow", "gold", "orange"].includes(normalized)) return "yellow";
  if (["blue", "indigo", "purple"].includes(normalized)) return "blue";
  return "green";
}

function normalizeProgressInsights(raw: unknown): ProgressInsights {
  const source = asRecord(raw);

  const strengthInput = pickArray(source, ["strengthData", "strength", "strength_data"]);
  const volumeInput = pickArray(source, ["volumeData", "volume", "volume_data"]);
  const sleepInput = pickArray(source, ["sleepData", "sleep", "sleep_data"]);
  const achievementsInput = pickArray(source, ["achievements", "badges"]);
  const recordsInput = pickArray(source, ["personalRecords", "records", "personal_records"]);

  const prHistory = pickArray(source, ["pr_history", "prHistory"]);
  const setLogs = pickArray(source, ["setlog", "setlogs", "logs"]);
  const checkins = pickArray(source, ["checkin", "checkins"]);

  const strengthData =
    strengthInput.length > 0
      ? strengthInput.map((item, index) => {
          const row = asRecord(item);
          return {
            week: String(row.week ?? row.label ?? `Week ${index + 1}`),
            squat: asNumber(row.squat, 0),
            bench: asNumber(row.bench, 0),
            deadlift: asNumber(row.deadlift, 0),
          };
        })
      : prHistory
          .slice(0, 12)
          .map((item) => asRecord(item))
          .map((row, index) => {
            const metric = String(row.metric ?? row.exercise_name ?? row.exercise ?? "").toLowerCase();
            const value = asNumber(row.value, 0);
            return {
              week: String(row.week ?? `Week ${index + 1}`),
              squat: metric.includes("squat") ? value : 0,
              bench: metric.includes("bench") ? value : 0,
              deadlift: metric.includes("deadlift") ? value : 0,
            };
          })
          .reduce<Array<{ week: string; squat: number; bench: number; deadlift: number }>>((acc, row) => {
            const existing = acc.find((item) => item.week === row.week);
            if (existing) {
              existing.squat = Math.max(existing.squat, row.squat);
              existing.bench = Math.max(existing.bench, row.bench);
              existing.deadlift = Math.max(existing.deadlift, row.deadlift);
            } else {
              acc.push(row);
            }
            return acc;
          }, []);

  const weekdays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  const volumeData =
    volumeInput.length > 0
      ? volumeInput.map((item) => {
          const row = asRecord(item);
          return {
            day: String(row.day ?? "-"),
            volume: Math.max(0, asNumber(row.volume, 0)),
          };
        })
      : weekdays.map((label, dayIndex) => {
          const volume = setLogs
            .map((entry) => asRecord(entry))
            .filter((entry) => {
              const dateRaw = entry.executed_at ?? entry.date;
              if (typeof dateRaw !== "string") return false;
              const parsed = new Date(dateRaw);
              return !Number.isNaN(parsed.getTime()) && parsed.getDay() === dayIndex;
            })
            .reduce((sum, entry) => sum + asNumber(entry.weight, 0) * asNumber(entry.reps, 0), 0);

          return { day: label, volume: Math.round(volume) };
        });

  const sleepData =
    sleepInput.length > 0
      ? sleepInput.map((item) => {
          const row = asRecord(item);
          return {
            date: String(row.date ?? "-"),
            hours: Math.max(0, Math.min(24, asNumber(row.hours, 0))),
          };
        })
      : checkins
          .map((item) => asRecord(item))
          .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
          .slice(-7)
          .map((row) => ({
            date: String(row.date ?? "-").slice(5),
            hours: Math.max(0, Math.min(24, asNumber(row.sleep_hours, 0))),
          }));

  const achievements =
    achievementsInput.length > 0
      ? achievementsInput.map((item) => {
          const row = asRecord(item);
          return {
            title: String(row.title ?? "Achievement"),
            description: String(row.description ?? ""),
            color: mapAchievementColor(row.color),
          };
        })
      : [
          {
            title: "Consistent",
            description: `${checkins.length} check-ins gelogd`,
            color: "green" as const,
          },
          {
            title: "Power Tracker",
            description: `${setLogs.length} sets gelogd`,
            color: "blue" as const,
          },
          {
            title: "PR Focus",
            description: `${prHistory.length} PR entries`,
            color: "yellow" as const,
          },
        ];

  const personalRecords =
    recordsInput.length > 0
      ? recordsInput.map((item) => {
          const row = asRecord(item);
          return {
            exercise: String(row.exercise ?? row.metric ?? "Exercise"),
            weight: asNumber(row.weight ?? row.value, 0),
            unit: String(row.unit ?? row.standard_unit ?? "kg"),
            changePct:
              row.changePct === undefined && row.change_pct === undefined
                ? undefined
                : asNumber(row.changePct ?? row.change_pct, 0),
          };
        })
      : prHistory
          .map((item) => asRecord(item))
          .reduce<Array<{ exercise: string; weight: number; unit: string; changePct?: number }>>((acc, row) => {
            const exercise = String(row.metric ?? row.exercise_name ?? row.exercise_id ?? "PR");
            const value = asNumber(row.value, 0);
            const unit = String(row.standard_unit ?? "kg");
            const existing = acc.find((entry) => entry.exercise === exercise);
            if (!existing) {
              acc.push({ exercise, weight: value, unit });
            } else if (value > existing.weight) {
              existing.weight = value;
            }
            return acc;
          }, [])
          .slice(0, 8);

  const sleepInsight =
    typeof source.sleepInsight === "string"
      ? source.sleepInsight
      : typeof source.sleep_insight === "string"
        ? source.sleep_insight
        : undefined;

  return {
    strengthData,
    volumeData,
    sleepData,
    achievements,
    personalRecords,
    sleepInsight,
  };
}

export const sinasAgent = {
  isConfigured: () => Boolean(SINAS_BASE_URL && SINAS_API_KEY),
  getActiveUserId,
  setActiveUserId,
  getLastDebugInfo: (): SinasDebugInfo => ({ ...lastSinasDebug }),

  getWorkoutSessions: async (): Promise<WorkoutSession[]> => {
    const result = await runAgentRequest({
      task: "get_workout_sessions",
      input: {
        schema: "public",
        tables: ["workout", "workout_exercise", "setlog", "exercise"],
        user_id: getActiveUserId(),
      },
    });

    const record = asRecord(result);
    const status = String(record.status ?? "").toLowerCase();
    const error = asRecord(record.error);
    const errorCode = String(error.code ?? "").toUpperCase();
    const workoutPlan = asRecord(record.workout_plan);
    const workoutPlanStatus = String(workoutPlan.status ?? "").toLowerCase();
    const existingSessions = normalizeSessionsFromPayload(result);
    const schemaOnly = isSchemaOnlyPayload(result);

    // If DB connections are not allowed for this agent, fall back to direct generation.
    if (status === "error" && errorCode === "CONNECTION_NOT_ALLOWED") {
      return await sinasAgent.generateWorkoutPlan({ goal: "strength" });
    }

    // If there is no user data yet, proactively generate a starter plan.
    if (
      (workoutPlanStatus === "no_data" || status === "no_data") &&
      existingSessions.length === 0
    ) {
      return await sinasAgent.generateWorkoutPlan({ goal: "strength" });
    }

    // Some runtime answers contain only schema introspection instead of real rows.
    // In that case, generate a usable starter plan for the current app user.
    if (schemaOnly || existingSessions.length === 0) {
      return await sinasAgent.generateWorkoutPlan({ goal: "strength" });
    }

    return existingSessions;
  },

  generateWorkoutPlan: async (options?: {
    goal?: UserProfile["goal"];
    requestId?: string;
  }): Promise<WorkoutSession[]> => {
    const agentGoal = mapUiGoalToAgentGoal(options?.goal);
    const generationInput = {
      schema: "public",
      tables: ["program", "target", "profile", "workout", "workout_exercise"],
      user_id: getActiveUserId(),
      goal_type: options?.goal,
      profile_goal: options?.goal,
      user_goal: agentGoal,
      available_time_minutes: 60,
      equipment: ["barbell", "dumbbell", "bodyweight"],
      preferred_exercises: [],
      workout_history: [],
      recovery: {
        sleep: 7,
        stress: 5,
        energy: 6,
      },
      constraints: {
        injury_notes: "",
        avoid_exercises: [],
        preferred_split: "full_body",
      },
      regenerate: true,
      force_refresh: true,
      request_id: options?.requestId ?? `regen-${Date.now()}`,
      intent: "Generate a new workout schedule for this user and return full sessions with exercises and sets.",
    };

    const tasks: AgentTask[] = [
      "generate_workout_plan",
      "generate_schedule",
      "create_workout_plan",
    ];

    for (const task of tasks) {
      try {
        const result = await runAgentRequest({
          task,
          input: generationInput,
        });
        const sessions = normalizeSessionsFromPayload(result);
        if (sessions.length > 0) {
          return sessions;
        }
      } catch {
        // Try next task alias
      }
    }

    const fallbackResult = await runAgentRequest({
      task: "get_workout_sessions",
      input: {
        schema: "public",
        tables: ["workout", "workout_exercise", "setlog", "exercise"],
        user_id: getActiveUserId(),
        regenerate: true,
      },
    });

    return normalizeSessionsFromPayload(fallbackResult);
  },

  updateWorkoutSet: async (
    sessionId: string,
    exerciseId: string,
    setId: string,
    data: unknown,
  ) => {
    const result = await runAgentRequest({
      task: "update_workout_set",
      input: {
        schema: "public",
        table: "setlog",
        workout_id: sessionId,
        workout_exercise_id: exerciseId,
        setlog_id: setId,
        ...((data as object) ?? {}),
      },
    });
    return { success: true, data: extractUsefulPayload(result) };
  },

  getUserProfile: async (): Promise<UserProfile | null> => {
    const result = await runAgentRequest({
      task: "get_user_profile",
      input: {
        schema: "public",
        tables: ["profile", "user", "program", "target"],
        user_id: getActiveUserId(),
      },
    });
    return normalizeProfile(result);
  },

  updateUserProfile: async (data: Partial<UserProfile>) => {
    const result = await runAgentRequest({
      task: "update_user_profile",
      input: {
        schema: "public",
        user_id: getActiveUserId(),
        goal_type: data.goal,
        experience_level: data.experienceLevel,
        preferred_time: data.preferences?.preferredTime,
        available_days: data.availableDays,
        excluded_exercises: data.preferences?.excludedExercises,
      },
    });
    return { success: true, data: extractUsefulPayload(result) };
  },

  submitDailyCheckIn: async (checkIn: DailyCheckIn) => {
    const result = await runAgentRequest({
      task: "submit_daily_check_in",
      input: {
        schema: "public",
        table: "checkin",
        user_id: getActiveUserId(),
        date: checkIn.date,
        sleep_hours: checkIn.sleep.hours,
        sleep_quality: checkIn.sleep.quality,
        steps: checkIn.steps,
        mood: checkIn.mood,
        details: checkIn.notes,
      },
    });
    return { success: true, data: extractUsefulPayload(result) };
  },

  getDailyCheckIns: async (days = 30): Promise<DailyCheckIn[]> => {
    const result = await runAgentRequest({
      task: "get_daily_check_ins",
      input: {
        schema: "public",
        table: "checkin",
        user_id: getActiveUserId(),
        days,
      },
    });
    const items = toArray(result);
    return items.map((item, index) => normalizeCheckIn(item, index));
  },

  getProgressInsights: async (): Promise<ProgressInsights> => {
    const result = await runAgentRequest({
      task: "get_progress_insights",
      input: {
        schema: "public",
        tables: ["pr_history", "setlog", "checkin", "measurement", "exercise"],
        user_id: getActiveUserId(),
        expected_shape: {
          strengthData: [{ week: "Week 1", squat: 0, bench: 0, deadlift: 0 }],
          volumeData: [{ day: "Ma", volume: 0 }],
          sleepData: [{ date: "01/06", hours: 0 }],
          achievements: [{ title: "", description: "", color: "green" }],
          personalRecords: [{ exercise: "", weight: 0, unit: "kg", changePct: 0 }],
          sleepInsight: "",
        },
      },
    });

    return normalizeProgressInsights(result);
  },

  syncWithFitnessApps: async (appName: string) => {
    await runAgentRequest({ task: "sync_fitness_app", input: { appName } });
    return { success: true };
  },
};
