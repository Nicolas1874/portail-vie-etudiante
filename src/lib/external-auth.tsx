import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppName } from "./auth-context";

export interface ExternalUser {
  email: string;
  fullName?: string;
  [key: string]: unknown;
}

interface ExternalAuthState {
  user: ExternalUser | null;
  token: string | null;
  apps: AppName[]; // applications auxquelles l'utilisateur a accès (selon l'API)
}

interface ExternalAuthContextValue extends ExternalAuthState {
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "portal.externalAuth.v1";
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

const ExternalAuthContext = createContext<ExternalAuthContextValue | undefined>(undefined);

/**
 * Normalise la liste d'applications renvoyée par l'API en clés d'app connues.
 * Accepte plusieurs formats possibles : tableau de strings, d'objets {key|code|name},
 * ou champ `applications` / `apps` / `roles` sur la réponse.
 */
function normalizeApps(raw: unknown): AppName[] {
  const known: AppName[] = ["AIDE", "HANDICAP", "CVEC"];
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [];
  const out = new Set<AppName>();
  for (const item of list) {
    let candidate = "";
    if (typeof item === "string") candidate = item;
    else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      candidate = String(obj.key ?? obj.code ?? obj.application ?? obj.name ?? obj.id ?? "");
    }
    const upper = candidate.toUpperCase().trim();
    // Mappings souples (libellés FR éventuels)
    if (known.includes(upper as AppName)) out.add(upper as AppName);
    else if (upper.includes("AIDE") || upper.includes("GUICHET")) out.add("AIDE");
    else if (upper.includes("HANDI")) out.add("HANDICAP");
    else if (upper.includes("CVEC")) out.add("CVEC");
  }
  return Array.from(out);
}

function extractApps(payload: Record<string, unknown>): AppName[] {
  const candidates = [
    payload.applications,
    payload.apps,
    (payload.user as Record<string, unknown> | undefined)?.applications,
    (payload.user as Record<string, unknown> | undefined)?.apps,
    payload.access,
    payload.roles,
  ];
  for (const c of candidates) {
    const apps = normalizeApps(c);
    if (apps.length > 0) return apps;
  }
  return [];
}

export function ExternalAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExternalAuthState>({ user: null, token: null, apps: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const persist = (next: ExternalAuthState) => {
    setState(next);
    try {
      if (next.user) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleAuthResponse = async (res: Response, fallbackEmail: string) => {
    let payload: Record<string, unknown> = {};
    const text = await res.text();
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }

    if (!res.ok) {
      const msg =
        (typeof payload.message === "string" && payload.message) ||
        (typeof payload.error === "string" && payload.error) ||
        `Erreur ${res.status}`;
      throw new Error(msg);
    }

    const token =
      (typeof payload.token === "string" && payload.token) ||
      (typeof payload.access_token === "string" && payload.access_token) ||
      null;

    const userObj =
      (payload.user && typeof payload.user === "object" ? (payload.user as Record<string, unknown>) : null) ||
      payload;

    const user: ExternalUser = {
      email: String(userObj.email ?? fallbackEmail),
      fullName:
        typeof userObj.fullName === "string"
          ? userObj.fullName
          : typeof userObj.full_name === "string"
            ? userObj.full_name
            : typeof userObj.name === "string"
              ? userObj.name
              : undefined,
    };

    const apps = extractApps(payload);
    persist({ user, token, apps });
  };

  const login = useCallback(async (email: string, password: string) => {
    if (!API_URL) throw new Error("VITE_API_URL n'est pas configuré.");
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await handleAuthResponse(res, email);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    if (!API_URL) throw new Error("VITE_API_URL n'est pas configuré.");
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password, fullName, full_name: fullName, name: fullName }),
    });
    await handleAuthResponse(res, email);
  }, []);

  const logout = useCallback(() => {
    persist({ user: null, token: null, apps: [] });
  }, []);

  const value = useMemo<ExternalAuthContextValue>(
    () => ({ ...state, loading, login, register, logout }),
    [state, loading, login, register, logout],
  );

  return <ExternalAuthContext.Provider value={value}>{children}</ExternalAuthContext.Provider>;
}

export function useExternalAuth() {
  const ctx = useContext(ExternalAuthContext);
  if (!ctx) throw new Error("useExternalAuth must be used inside ExternalAuthProvider");
  return ctx;
}
