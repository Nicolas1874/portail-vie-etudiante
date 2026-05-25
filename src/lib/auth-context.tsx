import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/auth.functions";

export type AppName = "AIDE" | "HANDICAP" | "CVEC";
export type AppRole = "admin" | "partenaire" | "direction";

export interface UserRole {
  application: AppName;
  role: AppRole;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  hasAppAccess: (app: AppName) => boolean;
  isAppAdmin: (app: AppName) => boolean;
  accessibleApps: AppName[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const getMyRolesFn = useServerFn(getMyRoles);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    try {
      const data = await getMyRolesFn({ data: { userId: uid } });
      setRoles(data.roles ?? []);
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [getMyRolesFn]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (user) await loadRoles(user.id);
  };

  const hasDirection = roles.some((r) => r.role === "direction");
  const hasAppAccess = (app: AppName) =>
    hasDirection || roles.some((r) => r.application === app);
  const isAppAdmin = (app: AppName) =>
    roles.some((r) => r.application === app && r.role === "admin");

  const accessibleApps: AppName[] = (["AIDE", "HANDICAP", "CVEC"] as AppName[]).filter(
    hasAppAccess,
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        loading,
        signOut,
        refreshRoles,
        hasAppAccess,
        isAppAdmin,
        accessibleApps,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
