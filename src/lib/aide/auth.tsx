import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  /** L'utilisateur a au moins un rôle métier (peut écrire dans les fiches usagers). */
  isMetier: boolean;
  /** L'utilisateur est admin sans aucun rôle métier endossé (lecture seule sur les fiches). */
  isAdminPur: boolean;
  hasRole: (r: AppRole) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const loadProfileAndRoles = async (uid: string) => {
    try {
      const [{ data: p, error: profileError }, { data: r, error: rolesError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      if (profileError || rolesError) {
        console.error("Erreur de chargement du profil", {
          profileError,
          rolesError,
          uid,
        });
      }

      setProfile((p as UserProfile) ?? null);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    } catch (error) {
      console.error("Impossible de charger le profil utilisateur", error);
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        // Defer to avoid deadlock
        setTimeout(() => {
          void loadProfileAndRoles(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) {
          void loadProfileAndRoles(data.session.user.id);
        }
      })
      .catch((error) => {
        console.error("Impossible de récupérer la session", error);
        setSession(null);
        setProfile(null);
        setRoles([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => sub.subscription.unsubscribe();
  }, []);

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
      if (session?.user) await loadProfileAndRoles(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
