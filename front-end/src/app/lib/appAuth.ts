type RegisterInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AppAccount = {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
};

type AppSession = {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
};

const ACCOUNTS_KEY = "gymtracker_app_accounts";
const SESSION_KEY = "gymtracker_app_session";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Authentication is only available in the browser");
  }
}

function loadAccounts(): AppAccount[] {
  assertBrowser();
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AppAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: AppAccount[]) {
  assertBrowser();
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function loadSession(): AppSession | null {
  assertBrowser();
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed?.userId || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: AppSession | null) {
  assertBrowser();
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function sha256(value: string) {
  assertBrowser();
  const data = new TextEncoder().encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createSession(userId: string, email: string): AppSession {
  return {
    token: window.crypto.randomUUID(),
    userId,
    email,
    createdAt: new Date().toISOString(),
  };
}

export const appAuth = {
  getSession: () => {
    if (typeof window === "undefined") return null;
    return loadSession();
  },

  register: async (input: RegisterInput) => {
    const email = normalizeEmail(input.email);
    const password = input.password.trim();

    if (!email) throw new Error("E-mail is verplicht");
    if (password.length < 8) throw new Error("Gebruik minimaal 8 tekens voor je wachtwoord");

    const accounts = loadAccounts();
    if (accounts.some((account) => normalizeEmail(account.email) === email)) {
      throw new Error("Dit e-mailadres bestaat al");
    }

    const passwordHash = await sha256(password);
    const account: AppAccount = {
      id: window.crypto.randomUUID(),
      email,
      passwordHash,
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const nextAccounts = [account, ...accounts];
    saveAccounts(nextAccounts);

    const session = createSession(account.id, account.email);
    saveSession(session);

    return {
      session,
      user: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      },
    };
  },

  login: async (input: LoginInput) => {
    const email = normalizeEmail(input.email);
    const password = input.password.trim();
    if (!email || !password) throw new Error("E-mail en wachtwoord zijn verplicht");

    const accounts = loadAccounts();
    const account = accounts.find((item) => normalizeEmail(item.email) === email);
    if (!account) throw new Error("Account niet gevonden");

    const passwordHash = await sha256(password);
    if (passwordHash !== account.passwordHash) {
      throw new Error("Onjuist wachtwoord");
    }

    const session = createSession(account.id, account.email);
    saveSession(session);

    return {
      session,
      user: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      },
    };
  },

  logout: () => {
    if (typeof window === "undefined") return;
    saveSession(null);
  },
};
