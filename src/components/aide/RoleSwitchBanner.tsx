import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FlaskConical, RotateCcw } from "lucide-react";
import { ROLES } from "@/lib/labels";
import { toast } from "sonner";
import {
  clearStoredRoleSwitchState,
  getStoredRoleSwitchState,
  getRoleSwitchStorageKey,
} from "@/lib/role-switch";

interface OriginalProfile {
  roles: AppRole[];
  structure_id: string | null;
}

export function RoleSwitchBanner() {
  const { profile, roles, refresh } = useAuth();
  const [original, setOriginal] = useState<OriginalProfile | null>(null);
  const [structureName, setStructureName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const storageKey = getRoleSwitchStorageKey(profile?.id);

  useEffect(() => {
    let cancelled = false;

    const loadOriginal = async () => {
      const state = await getStoredRoleSwitchState(profile?.id);
      if (!cancelled) {
        setOriginal((state as OriginalProfile | null) ?? null);
      }
    };

    void loadOriginal();

    return () => {
      cancelled = true;
    };
  }, [storageKey, roles, profile?.structure_id, profile?.id]);

  useEffect(() => {
    if (!profile?.structure_id) return setStructureName("");
    supabase
      .from("structures")
      .select("nom")
      .eq("id", profile.structure_id)
      .maybeSingle()
      .then(({ data }) => setStructureName(data?.nom ?? ""));
  }, [profile?.structure_id]);

  if (!original) return null;

  const currentLabel = roles.map((r) => ROLES[r] ?? r).join(", ");

  const restore = async () => {
    if (!profile?.id) return;
    const snapshot = original ?? (await getStoredRoleSwitchState(profile.id));
    if (!snapshot) {
      toast.error("Aucun profil initial mémorisé");
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("admin_restore_user_roles", {
      _target_user: profile.id,
      _roles: snapshot.roles,
      _structure_id: snapshot.structure_id ?? undefined,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    clearStoredRoleSwitchState(profile.id);
    setOriginal(null);
    setBusy(false);
    toast.success("Profil initial restauré");
    await refresh();
  };

  return (
    <div className="bg-amber-100 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-800 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span className="truncate">
          <strong>Mode {currentLabel}</strong>
          {structureName && <> · {structureName}</>}
          <span className="ml-2 text-amber-800/80 dark:text-amber-300/80">
            (rôle endossé pour test)
          </span>
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={restore} disabled={busy} className="shrink-0">
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Revenir au mode initial
      </Button>
    </div>
  );
}
