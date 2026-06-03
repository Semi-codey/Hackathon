/*
  Lightweight Google Calendar integration using OAuth2 PKCE for browser-based auth.
  - Requires env var: VITE_GOOGLE_CLIENT_ID
  - Uses sessionStorage/localStorage to persist PKCE and tokens.
  - Inserts simple events for provided workout sessions.

  NOTE: For production, consider moving token exchange to a backend for better security
  and refreshing tokens with the refresh_token securely.
*/

import type { WorkoutSession } from "../types/workout";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const REDIRECT_PATH = "/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function base64UrlEncode(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(hash);
}

function randomString(length = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => ("0" + b.toString(16)).slice(-2))
    .join("");
}

export async function openGoogleAuth(state?: string) {
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID not configured");

  const codeVerifier = randomString(64);
  const codeChallenge = await sha256(codeVerifier);

  sessionStorage.setItem("google_code_verifier", codeVerifier);
  if (state) sessionStorage.setItem("google_oauth_state", state);

  const redirectUri = `${location.origin}${REDIRECT_PATH}`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    include_granted_scopes: "true",
    access_type: "offline",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  // Redirect user to Google consent screen
  location.href = url;
}

export async function exchangeCodeForTokens(code: string) {
  const codeVerifier = sessionStorage.getItem("google_code_verifier");
  if (!codeVerifier) throw new Error("Missing PKCE code verifier");
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID not configured");

  const redirectUri = `${location.origin}${REDIRECT_PATH}`;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Token exchange failed: " + text);
  }

  const data = await res.json();
  // data contains access_token, expires_in, refresh_token (if granted), scope, token_type
  localStorage.setItem("google_tokens", JSON.stringify(data));
  return data;
}

function getSavedTokens() {
  const raw = localStorage.getItem("google_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function insertEvent(accessToken: string, event: any) {
  const res = await fetch(GOOGLE_CALENDAR_EVENTS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Failed to insert event: " + text);
  }
  return res.json();
}

export async function insertSessionsAsEvents(sessions: WorkoutSession[]) {
  const tokens = getSavedTokens();
  if (!tokens?.access_token) {
    // No tokens -> start auth flow and store sessions for pending sync
    sessionStorage.setItem("pendingSessions", JSON.stringify(sessions));
    sessionStorage.setItem("pendingSync", "1");
    await openGoogleAuth("SYNC");
    return {
      success: false,
      message: "Redirecting to Google for authorization",
    };
  }

  const accessToken = tokens.access_token as string;

  for (const s of sessions) {
    const startDate = new Date(s.date + "T18:00:00");
    const endDate = new Date(startDate.getTime() + (s.duration || 60) * 60000);

    const event = {
      summary: s.name,
      description: s.notes || "GymTracker Pro training",
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      reminders: { useDefault: true },
    };

    await insertEvent(accessToken, event).catch((err) => {
      console.error("Insert event error", err);
      throw err;
    });
  }

  return { success: true };
}

export async function finishPendingSyncIfAny() {
  const pending = sessionStorage.getItem("pendingSync");
  if (!pending) return { performed: false };
  const sessionsRaw = sessionStorage.getItem("pendingSessions");
  if (!sessionsRaw) return { performed: false };
  try {
    const sessions: WorkoutSession[] = JSON.parse(sessionsRaw);
    const result = await insertSessionsAsEvents(sessions);
    // cleanup
    sessionStorage.removeItem("pendingSync");
    sessionStorage.removeItem("pendingSessions");
    return { performed: true, result };
  } catch (err) {
    console.error("finishPendingSyncIfAny failed", err);
    return { performed: false, error: String(err) };
  }
}

export default {
  openGoogleAuth,
  exchangeCodeForTokens,
  insertSessionsAsEvents,
  finishPendingSyncIfAny,
};
