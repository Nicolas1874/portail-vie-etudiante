// Adaptateur d'auth pour le module AIDE.
// Lit l'utilisateur connecté au portail (localStorage `uo_user`) et expose
// la même API que l'ancien provider Guichet Connect (useAuth, profile, roles…).
// La session Supabase reste utilisée par les requêtes data ; si l'utilisateur
// du portail n'est pas signé dans Supabase AIDE, les requêtes RLS renverront
// des listes vides (à brancher via /api/login → supabase.auth.signInWithPassword
// dans une étape suivante).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "superviseur" | "agent" | "prescripteur" | "partenaire" | "ccas" | "scd_presto";
export type Affectation = "cp" | "presto" | "logement" | null;

export interface UserProfile {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string;
  fonction: string | null;
  structure_id: string | null;
  structure_partenaire_id: string | null;
  auth_method: "cas" | "email";
  active: boolean;
  affectation: Affectation;
}

export interface AuthCtx {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isMetier: boolean;
  isAdminPur: boolean;
  hasRole: (r: AppRole) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

interface PortalUser {
  id?: string;
  email?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  apps?: string[];
}

function readPortalUser(): PortalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("uo_user");
    return raw ? (JSON.parse(raw) as PortalUser) : null;
  } catch {
    return null;
  }
}

function rolesFromPortal(u: PortalUser | null, profileFromAide?: any): AppRole[] {
  const roles: AppRole[] = [];
  
  // 1. Rôles depuis le Portail (uo_user)
  if (u?.role) {
    const r = u.role.toLowerCase();
    if (r === "superadmin" || r === "admin") {
      roles.push("admin", "superviseur", "agent");
    } else {
      roles.push("agent");
    }
  }

  // 2. Rôles depuis le SI AIDE (si l'utilisateur est reconnu par email)
  if (profileFromAide?.role) {
    const aideRole = profileFromAide.role.toLowerCase() as AppRole;
    if (!roles.includes(aideRole)) {
      roles.push(aideRole);
    }
  }

  return roles.length > 0 ? roles : ["agent"];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);

  const [aideProfile, setAideProfile] = useState<any>(null);

  useEffect(() => {
    const u = readPortalUser();
    setPortalUser(u);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "uo_user") setPortalUser(readPortalUser());
    };
    window.addEventListener("storage", onStorage);

    // Si on a un email portal, on cherche le profil dans le SI AIDE
    if (u?.email) {
      supabase
        .from("profiles")
        .select("*")
        .eq("email", u.email)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setAideProfile(data);
        });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("storage", onStorage);
      sub.subscription.unsubscribe();
    };
  }, []);

  const roles = rolesFromPortal(portalUser, aideProfile);

  const profile: UserProfile | null = portalUser
    ? {
        id: aideProfile?.id ?? portalUser.id ?? portalUser.email ?? "portal-user",
        nom: aideProfile?.nom ?? portalUser.nom ?? null,
        prenom: aideProfile?.prenom ?? portalUser.prenom ?? null,
        email: portalUser.email ?? "",
        fonction: aideProfile?.fonction ?? null,
        structure_id: aideProfile?.structure_id ?? null,
        structure_partenaire_id: aideProfile?.structure_partenaire_id ?? null,
        auth_method: aideProfile?.auth_method ?? "cas",
        active: aideProfile?.active ?? true,
        affectation: aideProfile?.affectation ?? null,
      }
    : null;

  const value: AuthCtx = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin: roles.includes("admin"),
    isMetier: roles.some((r) => r !== "admin"),
    isAdminPur: roles.includes("admin") && !roles.some((r) => r !== "admin"),
    hasRole: (r) => roles.includes(r),
    refresh: async () => {
      setPortalUser(readPortalUser());
    },
    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("uo_user");
        window.location.href = "/login";
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
