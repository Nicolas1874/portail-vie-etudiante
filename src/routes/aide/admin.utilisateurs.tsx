import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, fullName } from "@/lib/aide/labels";
import type { AppRole } from "@/lib/aide/auth";
import { toast } from "sonner";
import { UserPlus, Pencil } from "lucide-react";
import { ConfirmDelete } from "@/components/aide/ConfirmDelete";
import { useAuth } from "@/lib/aide/auth";

export const Route = createFileRoute("/aide/admin/utilisateurs")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").order("nom"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("structures").select("id, nom").order("nom"),
    ]);
    const byUser: Record<string, AppRole[]> = {};
    (r ?? []).forEach((x: any) => {
      byUser[x.user_id] = [...(byUser[x.user_id] ?? []), x.role];
    });
    setUsers((p ?? []).map((u: any) => ({ ...u, roles: byUser[u.id] ?? [] })));
    setStructures(s ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const removeUser = async (uid: string, label: string) => {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: uid },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Erreur");
    } else {
      toast.success(`${label} supprimé`);
      load();
    }
  };

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Gestion des rôles, rattachements et invitations."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un utilisateur
          </Button>
        }
      />
      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 data-table">
              <tr>
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Structure</th>
                <th className="text-left px-4 py-3">Rôles</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const struct = structures.find((s) => s.id === u.structure_id);
                return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{fullName(u)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {struct?.nom ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">aucun</span>
                      ) : (
                        u.roles.map((r: AppRole) => (
                          <Badge key={r} variant="secondary">
                            {ROLES[r]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {user?.id !== u.id && (
                        <ConfirmDelete
                          title={`Supprimer ${fullName(u) || u.email} ?`}
                          description="Le compte d'authentification, le profil et les rôles seront supprimés. Les données créées par cet utilisateur (usagers, demandes…) seront conservées mais orphelines. Action irréversible."
                          onConfirm={() => removeUser(u.id, fullName(u) || u.email)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted-foreground mt-3">
          Astuce : pour vous attribuer le rôle d'administrateur la première fois, ajoutez-le
          directement dans la base via Cloud → Database → Tables → user_roles.
        </p>
      </div>

      {inviteOpen && (
        <InviteDialog
          structures={structures}
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false);
            load();
          }}
        />
      )}
      {editing && (
        <EditProfileDialog
          item={editing}
          structures={structures}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditProfileDialog({
  item,
  structures,
  onClose,
  onSaved,
}: {
  item: any;
  structures: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    prenom: item.prenom ?? "",
    nom: item.nom ?? "",
    fonction: item.fonction ?? "",
    email: item.email ?? "",
    active: item.active ?? true,
    structure_id: item.structure_id ?? "",
    structure_partenaire_id: item.structure_partenaire_id ?? "",
    affectation: (item.affectation as "cp" | "presto" | "logement" | null) ?? "",
  });
  const [partStructures, setPartStructures] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("partenaire_structures")
      .select("id, nom")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setPartStructures(data ?? []));
  }, []);
  const [roles, setRoles] = useState<Record<AppRole, boolean>>(() => {
    const map = {} as Record<AppRole, boolean>;
    (Object.keys(ROLES) as AppRole[]).forEach((r) => {
      map[r] = (item.roles ?? []).includes(r);
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase
      .from("profiles") as any)
      .update({
        prenom: f.prenom || null,
        nom: f.nom || null,
        fonction: f.fonction || null,
        email: f.email,
        active: f.active,
        structure_id: f.structure_id || null,
        structure_partenaire_id: f.structure_partenaire_id || null,
        affectation: f.affectation || null,
      })
      .eq("id", item.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    // Synchronise les rôles
    const current: AppRole[] = item.roles ?? [];
    const desired = (Object.keys(roles) as AppRole[]).filter((r) => roles[r]);
    const toAdd = desired.filter((r) => !current.includes(r));
    const toRemove = current.filter((r) => !desired.includes(r));
    if (toAdd.length > 0) {
      const { error: e1 } = await supabase
        .from("user_roles")
        .insert(toAdd.map((role) => ({ user_id: item.id, role })));
      if (e1) {
        setSaving(false);
        toast.error(e1.message);
        return;
      }
    }
    for (const r of toRemove) {
      const { error: e2 } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", item.id)
        .eq("role", r);
      if (e2) {
        setSaving(false);
        toast.error(e2.message);
        return;
      }
    }
    setSaving(false);
    toast.success("Utilisateur mis à jour");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prénom</Label>
              <Input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Fonction</Label>
            <Input value={f.fonction} onChange={(e) => setF({ ...f, fonction: e.target.value })} />
          </div>
          <div>
            <Label>Structure</Label>
            <Select
              value={f.structure_id || "none"}
              onValueChange={(v) =>
                setF({ ...f, structure_id: v === "none" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Structure partenaire (rôle « partenaire »)</Label>
            <Select
              value={f.structure_partenaire_id || "none"}
              onValueChange={(v) =>
                setF({ ...f, structure_partenaire_id: v === "none" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {partStructures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Détermine quels coups de pouce ce partenaire peut consulter.
            </p>
          </div>
          <div>
            <Label>Affectation métier (rôle « agent »)</Label>
            <Select
              value={f.affectation || "none"}
              onValueChange={(v) =>
                setF({ ...f, affectation: v === "none" ? "" : (v as any) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="cp">Coups de pouce</SelectItem>
                <SelectItem value="presto">PRESTO</SelectItem>
                <SelectItem value="logement">Logement</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Détermine l'écran métier unique d'un agent (sinon, accès complet).
            </p>
          </div>
          <div>
            <Label className="mb-2 block">Rôles</Label>
            <div className="rounded-md border border-border bg-muted/20 p-3 grid grid-cols-2 gap-2">
              {(Object.keys(ROLES) as AppRole[]).map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={!!roles[r]}
                    onCheckedChange={() =>
                      setRoles((s) => ({ ...s, [r]: !s[r] }))
                    }
                  />
                  <span>{ROLES[r]}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={f.active}
              onCheckedChange={(v) => setF({ ...f, active: !!v })}
            />
            Compte actif
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  structures,
  onClose,
  onInvited,
}: {
  structures: any[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    prenom: "",
    nom: "",
    fonction: "",
    structure_id: "",
  });
  const [selRoles, setSelRoles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return toast.error("Email requis");
    setLoading(true);
    const roles = Object.entries(selRoles)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: form.email,
        prenom: form.prenom,
        nom: form.nom,
        fonction: form.fonction,
        structure_id: form.structure_id || null,
        roles,
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Erreur");
      return;
    }
    toast.success("Invitation envoyée par e-mail");
    onInvited();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>E-mail *</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Un lien magique d'invitation lui sera envoyé pour activer son compte.
            </p>
          </div>
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
            <Label>Fonction</Label>
            <Input
              value={form.fonction}
              onChange={(e) => setForm({ ...form, fonction: e.target.value })}
            />
          </div>
          <div>
            <Label>Structure</Label>
            <Select
              value={form.structure_id || "none"}
              onValueChange={(v) =>
                setForm({ ...form, structure_id: v === "none" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              La structure détermine le territoire d'accès.
            </p>
          </div>
          <div>
            <Label className="mb-2 block">Rôles</Label>
            <div className="rounded-md border border-border bg-muted/20 p-3 grid grid-cols-2 gap-2">
              {(Object.keys(ROLES) as AppRole[]).map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={!!selRoles[r]}
                    onCheckedChange={() =>
                      setSelRoles((s) => ({ ...s, [r]: !s[r] }))
                    }
                  />
                  <span>{ROLES[r]}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Envoi…" : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
