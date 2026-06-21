import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";

export interface TerritoireOption {
  id: string;
  nom: string;
  accueille_etudiant: boolean;
  accueille_pij: boolean;
  accueille_paej: boolean;
}

interface TerritoireScopeCtx {
  /** "all" ou un UUID de territoire. */
  selected: string;
  setSelected: (v: string) => void;
  territoires: TerritoireOption[];
  /** True si l'utilisateur a le droit de basculer entre territoires (admin / superviseur). */
  canSwitch: boolean;
}

const Ctx = createContext<TerritoireScopeCtx | null>(null);
const STORAGE_KEY = "ga.territoire_scope";

export function TerritoireScopeProvider({ children }: { children: ReactNode }) {
  const { isAdmin, hasRole } = useAuth();
  const canSwitch = isAdmin || hasRole("superviseur");

  const [selected, setSelectedState] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return window.localStorage.getItem(STORAGE_KEY) ?? "all";
  });
  const [territoires, setTerritoires] = useState<TerritoireOption[]>([]);

  useEffect(() => {
    if (!canSwitch) return;
    supabase
      .from("territoires")
      .select("id, nom, accueille_etudiant, accueille_pij, accueille_paej")
      .order("nom")
      .then(({ data }) => setTerritoires((data as TerritoireOption[]) ?? []));
  }, [canSwitch]);

  const setSelected = (v: string) => {
    setSelectedState(v);
    if (typeof window !== "undefined") {
      if (v === "all") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, v);
    }
  };

  const value = useMemo<TerritoireScopeCtx>(
    () => ({ selected, setSelected, territoires, canSwitch }),
    [selected, territoires, canSwitch]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTerritoireScope() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerritoireScope must be used inside TerritoireScopeProvider");
  return ctx;
}
