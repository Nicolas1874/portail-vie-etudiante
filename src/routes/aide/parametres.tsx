import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, type AppRole } from "@/lib/auth";
import { toast } from "sonner";
import { FlaskConical, RotateCcw } from "lucide-react";
import { ROLES as ROLES_LABELS } from "@/lib/labels";
import {
  clearStoredRoleSwitchState,
  getStoredRoleSwitchState,
  getRoleSwitchStorageKey,
  readStoredRoleSwitchState,
} from "@/lib/role-switch";

export const Route = createFileRoute("/aide/parametres")({
  component: Settings,
});

const SWITCHABLE_ROLES: AppRole[] = ["admin", "superviseur", "agent", "prescripteur", "partenaire", "ccas", "scd_presto"];

function Settings() {
  const { profile, refresh, isAdmin, roles } = useAuth();
  const [structures, setStructures] = useState<{ id: string; nom: string; territoire_id: string | null }[]>([]);
  const [territoires, setTerritoires] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState({ nom: "", prenom: "", fonction: "", structure_id: "" });
  const [hasStoredSwitchState, setHasStoredSwitchState] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("structures").select("id, nom, territoire_id").order("nom"),
      supabase.from("territoires").select("id, nom").order("nom"),
    ]).then(([s, t]) => {
      setStructures((s.data ?? []) as any);
      setTerritoires(t.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        nom: profile.nom ?? "",
        prenom: profile.prenom ?? "",
        fonction: profile.fonction ?? "",
        structure_id: profile.structure_id ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    const loadSwitchState = async () => {
      const state = await getStoredRoleSwitchState(profile?.id);
      if (!cancelled) {
        setHasStoredSwitchState(!!state);
      }
    };

    void loadSwitchState();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, roles]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        nom: form.nom,
        prenom: form.prenom,
        fonction: form.fonction,
        structure_id: form.structure_id || null,
      })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profil mis à jour");
      await refresh();
    }
  };

  return (
    <div>
      <PageHeader title="Mon profil" description="Vos informations personnelles." />
      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
              <div>
                <Label>Fonction</Label>
                <Input
                  value={form.fonction}
                  onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                />
              </div>
              <div>
                <Label>Structure</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.structure_id}
                  onChange={(e) => setForm({ ...form, structure_id: e.target.value })}
                >
                  <option value="">— Aucune —</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Détermine votre territoire d'accès aux fiches usagers.
                </p>
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        {(isAdmin || hasStoredSwitchState) && (
          <RoleSwitcherCard
            currentRoles={roles}
            structures={structures}
            territoires={territoires}
            currentStructureId={profile?.structure_id ?? null}
            userId={profile?.id}
            onApplied={refresh}
          />
        )}
      </div>
    </div>
  );
}

function RoleSwitcherCard({
  currentRoles,
  structures,
  territoires,
  currentStructureId,
  userId,
  onApplied,
}: {
  currentRoles: AppRole[];
  structures: { id: string; nom: string; territoire_id: string | null }[];
  territoires: { id: string; nom: string }[];
  currentStructureId: string | null;
  userId?: string;
  onApplied: () => Promise<void>;
}) {
  const STORAGE_KEY = getRoleSwitchStorageKey(userId);
  const [role, setRole] = useState<AppRole>(currentRoles[0] ?? "admin");
  const [territoireId, setTerritoireId] = useState<string>("");
  const [structureId, setStructureId] = useState<string>(currentStructureId ?? "");
  const [busy, setBusy] = useState(false);
  const [hasOriginal, setHasOriginal] = useState(false);

  // Auto-déduit le territoire à partir de la structure actuelle au montage
  useEffect(() => {
    if (currentStructureId) {
      const s = structures.find((x) => x.id === currentStructureId);
      if (s?.territoire_id) setTerritoireId(s.territoire_id);
    }
  }, [currentStructureId, structures]);

  useEffect(() => {
    let cancelled = false;

    const loadOriginal = async () => {
      const state = await getStoredRoleSwitchState(userId);
      if (!cancelled) {
        setHasOriginal(!!state);
      }
    };

    void loadOriginal();

    return () => {
      cancelled = true;
    };
  }, [userId, currentRoles, currentStructureId]);

  const filteredStructures = useMemo(
    () => structures.filter((s) => !territoireId || s.territoire_id === territoireId),
    [structures, territoireId],
  );

  const needsTerritoire = role === "prescripteur" || role === "ccas";
  const needsStructure = role === "prescripteur" || role === "ccas" || role === "partenaire";

  const apply = async () => {
    if (!userId) return;
    if (needsTerritoire && !territoireId) {
      toast.error("Sélectionnez un territoire");
      return;
    }
    if (needsStructure && !structureId) {
      toast.error("Sélectionnez une structure");
      return;
    }
    setBusy(true);

    // Sauvegarde l'état initial (1ʳᵉ bascule seulement)
    if (STORAGE_KEY && !readStoredRoleSwitchState(userId)) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ roles: currentRoles, structure_id: currentStructureId }),
      );
    }

    // Bascule atomique côté serveur (SECURITY DEFINER) — évite la perte de droits en cours de route
    const { error: rpcErr } = await supabase.rpc("admin_set_user_role", {
      _target_user: userId,
      _new_role: role,
      _new_structure_id: needsStructure ? structureId : undefined,
    });
    if (rpcErr) {
      setBusy(false);
      toast.error(rpcErr.message);
      return;
    }

    setBusy(false);
    setHasOriginal(true);
    toast.success(`Profil basculé sur « ${ROLES_LABELS[role]} »`);
    await onApplied();
  };

  const restore = async () => {
    if (!userId || !STORAGE_KEY) return;
    const original = await getStoredRoleSwitchState(userId);
    if (!original) {
      toast.info("Aucun profil initial mémorisé");
      return;
    }

    setBusy(true);
    const { error: rpcErr } = await supabase.rpc("admin_restore_user_roles", {
      _target_user: userId,
      _roles: original.roles,
      _structure_id: original.structure_id ?? undefined,
    });
    if (rpcErr) {
      setBusy(false);
      toast.error(rpcErr.message);
      return;
    }
    clearStoredRoleSwitchState(userId);
    setBusy(false);
    setHasOriginal(false);
    toast.success("Profil initial restauré");
    await onApplied();
  };

  return (
    <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          Mode test — bascule de profil
          <Badge variant="outline" className="ml-2">Admin uniquement</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Permet de tester l'application sous l'angle d'un autre rôle. Les rôles initiaux sont mémorisés et peuvent être restaurés à tout moment.
          Rôles actuels : <span className="font-medium">{currentRoles.map((r) => ROLES_LABELS[r] ?? r).join(", ") || "aucun"}</span>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Rôle</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              {SWITCHABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLES_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Territoire {needsTerritoire && <span className="text-destructive">*</span>}</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={territoireId}
              onChange={(e) => {
                setTerritoireId(e.target.value);
                setStructureId("");
              }}
              disabled={!needsTerritoire && !needsStructure}
            >
              <option value="">— Aucun —</option>
              {territoires.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Structure {needsStructure && <span className="text-destructive">*</span>}</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={structureId}
              onChange={(e) => setStructureId(e.target.value)}
              disabled={!needsStructure}
            >
              <option value="">— Aucune —</option>
              {filteredStructures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={apply} disabled={busy}>
            Basculer le profil
          </Button>
          <Button variant="outline" onClick={restore} disabled={busy || !hasOriginal}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurer mon profil initial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
