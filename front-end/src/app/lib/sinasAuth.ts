type AuthUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type LoginStartResult = {
  sessionId: string;
  message?: string;
};

type VerifyOtpResult = {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
};

type RegisterInput = {
  email: string;
  firstName?: string;
  lastName?: string;
};

const SINAS_BASE_URL = (import.meta.env.VITE_SINAS_BASE_URL as string | undefined)?.trim();
const SINAS_API_KEY = (import.meta.env.VITE_SINAS_API_KEY as string | undefined)?.trim();
const REGISTER_ENDPOINT =
  (import.meta.env.VITE_SINAS_REGISTER_ENDPOINT as string | undefined)?.trim() || "/api/v1/users";
const GOOGLE_LOGIN_URL =
  (import.meta.env.VITE_SINAS_GOOGLE_LOGIN_URL as string | undefined)?.trim() || "";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function normalizeRuntimeBase(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.port === "51245" || /\/api(\/v\d+)?\/?$/i.test(parsed.pathname)) {
      return `${parsed.protocol}//${parsed.hostname}`;
    }
    return stripTrailingSlash(url);
  } catch {
    return stripTrailingSlash(url);
  }
}

function getBaseUrl() {
  if (!SINAS_BASE_URL) throw new Error("SINAS base URL is not configured");
  return normalizeRuntimeBase(SINAS_BASE_URL);
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function authHeaders(accessToken?: string) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(accessToken ? {} : SINAS_API_KEY ? { Authorization: `Bearer ${SINAS_API_KEY}` } : {}),
    ...(SINAS_API_KEY ? { "x-api-key": SINAS_API_KEY } : {}),
  };
}

async function request(path: string, init: RequestInit, accessToken?: string) {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeaders(accessToken),
      ...(init.headers ?? {}),
    },
  });

  const parsed = await parseResponse(res);
  if (!res.ok) {
    const message = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }
  return parsed;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function mapUser(raw: unknown): AuthUser {
  const record = toRecord(raw);
  return {
    id: pickString(record, ["id", "user_id", "uuid", "sub"]),
    email: pickString(record, ["email"]),
    firstName: pickString(record, ["first_name", "firstName", "given_name"]),
    lastName: pickString(record, ["last_name", "lastName", "family_name"]),
  };
}

export const sinasAuth = {
  async requestOtp(email: string): Promise<LoginStartResult> {
    const payload = toRecord(
      await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    );

    const sessionId = pickString(payload, ["session_id", "sessionId", "id"]);
    if (!sessionId) {
      throw new Error("No session_id returned by SINAS login endpoint");
    }

    return {
      sessionId,
      message: pickString(payload, ["message", "detail"]),
    };
  },

  async verifyOtp(sessionId: string, otpCode: string): Promise<VerifyOtpResult> {
    const payload = toRecord(
      await request("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          otp_code: otpCode,
        }),
      }),
    );

    return {
      accessToken: pickString(payload, ["access_token", "accessToken", "token"]),
      refreshToken: pickString(payload, ["refresh_token", "refreshToken"]),
      user: mapUser(payload.user ?? payload.profile ?? payload),
    };
  },

  async getMe(accessToken: string): Promise<AuthUser | null> {
    const payload = await request(
      "/auth/me",
      {
        method: "GET",
      },
      accessToken,
    );

    const user = mapUser(payload);
    return user.id || user.email ? user : null;
  },

  async logout(refreshToken: string) {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  async register(input: RegisterInput) {
    try {
      return await request(REGISTER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
        }),
      });
    } catch (error) {
      const message = String(error);
      if (message.includes("Not authorized to create users")) {
        throw new Error(
          "Signup is disabled on this SINAS project. Ask the admin to enable user creation or invite accounts.",
        );
      }
      throw error;
    }
  },

  getGoogleLoginUrl() {
    return GOOGLE_LOGIN_URL;
  },
};

export type { AuthUser, VerifyOtpResult };