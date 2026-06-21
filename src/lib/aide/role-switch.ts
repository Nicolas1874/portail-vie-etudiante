import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

export interface StoredRoleSwitchState {
  roles: AppRole[];
  structure_id: string | null;
}

export function getRoleSwitchStorageKey(userId?: string) {
  return userId ? `role-switch-original-${userId}` : "";
}

export function readStoredRoleSwitchState(userId?: string): StoredRoleSwitchState | null {
  if (typeof window === "undefined") return null;

  const storageKey = getRoleSwitchStorageKey(userId);
  if (!storageKey) return null;

  const raw = localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as StoredRoleSwitchState) : null;
}

export async function getStoredRoleSwitchState(userId?: string) {
  const localState = readStoredRoleSwitchState(userId);
  if (localState) return localState;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("admin_role_switch_states")
    .select("original_roles, original_structure_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Impossible de charger l'état de bascule", error);
    return null;
  }

  if (!data) return null;

  const state: StoredRoleSwitchState = {
    roles: (data.original_roles ?? []) as AppRole[],
    structure_id: data.original_structure_id,
  };

  if (typeof window !== "undefined") {
    const storageKey = getRoleSwitchStorageKey(userId);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }

  return state;
}

export function clearStoredRoleSwitchState(userId?: string) {
  if (typeof window === "undefined") return;

  const storageKey = getRoleSwitchStorageKey(userId);
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
}