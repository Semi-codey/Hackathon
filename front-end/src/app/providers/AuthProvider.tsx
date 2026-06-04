import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sinasAgent } from "../lib/sinasAgent";
import { appAuth } from "../lib/appAuth";

type AuthState = {
  email: string;
  userId: string;
  sessionToken: string;
};

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  email: string;
  userId: string;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  startGoogleLogin: () => void;
};

const AUTH_STORAGE_KEY = "sinas_auth_state";

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredState(): AuthState {
  if (typeof window === "undefined") {
    return { email: "", userId: "", sessionToken: "" };
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return { email: "", userId: "", sessionToken: "" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      email: parsed.email ?? "",
      userId: parsed.userId ?? "",
      sessionToken: parsed.sessionToken ?? "",
    };
  } catch {
    return { email: "", userId: "", sessionToken: "" };
  }
}

function persistState(state: AuthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadStoredState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = () => {
      const session = appAuth.getSession();
      if (cancelled) return;

      if (!session) {
        const empty = { email: "", userId: "", sessionToken: "" };
        setState(empty);
        persistState(empty);
        setIsLoading(false);
        return;
      }

      const nextState = {
        email: session.email,
        userId: session.userId,
        sessionToken: session.token,
      };

      setState(nextState);
      persistState(nextState);
      sinasAgent.setActiveUserId(session.userId);
      setIsLoading(false);
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const value = useMemo<AuthContextType>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(state.sessionToken),
      email: state.email,
      userId: state.userId,

      login: async (input) => {
        const result = await appAuth.login(input);
        sinasAgent.setActiveUserId(result.user.id);
        setState({
          email: result.user.email,
          userId: result.user.id,
          sessionToken: result.session.token,
        });
      },

      register: async (input) => {
        const result = await appAuth.register(input);
        sinasAgent.setActiveUserId(result.user.id);
        setState({
          email: result.user.email,
          userId: result.user.id,
          sessionToken: result.session.token,
        });
      },

      logout: async () => {
        appAuth.logout();
        setState({
          email: "",
          userId: "",
          sessionToken: "",
        });
      },

      startGoogleLogin: () => {
        throw new Error("Google login is not configured for app-local accounts yet");
      },
    }),
    [isLoading, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}