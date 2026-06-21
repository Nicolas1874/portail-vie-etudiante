import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/aide/admin/partenaires")({
  component: AdminPartenaires,
});

function AdminPartenaires() {
  const { isAdmin, hasRole } = useAuth();
  const canEdit = isAdmin || hasRole("superviseur");
  const [contacts, setContacts] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [liens, setLiens] = useState<any[]>([]);
  const [territoires, setTerritoires] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [editingStruct, setEditingStruct] = useState<any | null>(null);

  const load = async () => {
    const [p, s, t, l, ter] = await Promise.all([
      supabase.from("partenaires").select("*").order("nom"),
      supabase.from("partenaire_structures").select("*").order("nom"),
      supabase.from("themes_besoins").select("id, libelle").order("ordre"),
      supabase.from("partenaires_themes").select("partenaire_id, theme_id"),
      supabase.from("territoires").select("id, nom").order("nom"),
    ]);
    setContacts(p.data ?? []);
    setStructures(s.data ?? []);
    setThemes(t.data ?? []);
    setLiens(l.data ?? []);
    setTerritoires(ter.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const structById = useMemo(() => {
    const m = new Map<string, any>();
    structures.forEach((s) => m.set(s.id, s));
    return m;
  }, [structures]);

  const themesOf = (id: string) =>
    liens.filter((l) => l.partenaire_id === id).map((l) => l.theme_id);

  const toggleActif = async (p: any) => {
    await supabase.from("partenaires").update({ actif: !p.actif }).eq("id", p.id);
    load();
  };

  const removeContact = async (p: any) => {
    await supabase.from("partenaires_themes").delete().eq("partenaire_id", p.id);
    const { error } = await supabase.from("partenaires").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Contact supprimé");
      load();
    }
  };

  const removeStructure = async (s: any) => {
    const { error } = await supabase
      .from("partenaire_structures")
      .delete()
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Structure supprimée");
      load();
    }
  };

  return (
    <div>
      <PageHeader
        title="Partenaires"
        description="Annuaire des contacts partenaires rattachés à des structures."
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingStruct({})}>
                <Building2 className="h-4 w-4 mr-2" />
                Nouvelle structure
              </Button>
              <Button onClick={() => setEditing({})}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contact
              </Button>
            </div>
          )
        }
      />
      <div className="p-6 space-y-3">
        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucun contact partenaire enregistré.
            </CardContent>
          </Card>
        ) : (
          contacts.map((p) => {
            const tIds = themesOf(p.id);
            const struct = p.structure_partenaire_id
              ? structById.get(p.structure_partenaire_id)
              : null;
            return (
              <Card key={p.id} className={!p.actif ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {[p.prenom, p.nom].filter(Boolean).join(" ")}
                        </span>
                        {!p.actif && (
                          <Badge variant="outline" className="text-xs">
                            Désactivé
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[p.fonction, struct?.nom].filter(Boolean).join(" · ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[p.email, p.telephone].filter(Boolean).join(" · ")}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tIds.map((id) => {
                          const t = themes.find((x) => x.id === id);
                          if (!t) return null;
                          return (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {t.libelle}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing({ ...p, _themes: tIds })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActif(p)}
                          title={p.actif ? "Désactiver" : "Réactiver"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDelete
                          title={`Supprimer ${[p.prenom, p.nom].filter(Boolean).join(" ")} ?`}
                          description="Le contact partenaire et ses thématiques seront définitivement supprimés."
                          onConfirm={() => removeContact(p)}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      {editing !== null && (
        <ContactDialog
          item={editing}
          themes={themes}
          structures={structures}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCreateStructure={() => setEditingStruct({})}
        />
      )}
      {editingStruct !== null && (
        <StructureDialog
          item={editingStruct}
          territoires={territoires}
          onClose={() => setEditingStruct(null)}
          onSaved={() => {
            setEditingStruct(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ContactDialog({
  item,
  themes,
  structures,
  onClose,
  onSaved,
  onCreateStructure,
}: {
  item: any;
  themes: any[];
  structures: any[];
  onClose: () => void;
  onSaved: () => void;
  onCreateStructure: () => void;
}) {
  const [form, setForm] = useState<any>({
    prenom: item.prenom ?? "",
    nom: item.nom ?? "",
    fonction: item.fonction ?? "",
    email: item.email ?? "",
    telephone: item.telephone ?? "",
    structure_partenaire_id: item.structure_partenaire_id ?? "",
  });
  const [selThemes, setSelThemes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (item._themes ?? []).forEach((id: string) => (init[id] = true));
    return init;
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.structure_partenaire_id) {
      return toast.error("Veuillez sélectionner une structure.");
    }
    const payload = {
      prenom: form.prenom || null,
      nom: form.nom,
      fonction: form.fonction || null,
      email: form.email || null,
      telephone: form.telephone || null,
      structure_partenaire_id: form.structure_partenaire_id,
    };
    let id = item.id;
    if (id) {
      const { error } = await supabase.from("partenaires").update(payload).eq("id", id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase
        .from("partenaires")
        .insert(payload)
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      id = data!.id;
    }
    await supabase.from("partenaires_themes").delete().eq("partenaire_id", id);
    const checked = Object.entries(selThemes)
      .filter(([, v]) => v)
      .map(([k]) => ({ partenaire_id: id, theme_id: k }));
    if (checked.length > 0) {
      await supabase.from("partenaires_themes").insert(checked);
    }
    toast.success(item.id ? "Contact mis à jour" : "Contact créé");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Modifier le contact" : "Nouveau contact partenaire"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Structure *</Label>
            <div className="flex gap-2">
              <Select
                value={form.structure_partenaire_id || ""}
                onValueChange={(v) => setForm({ ...form, structure_partenaire_id: v })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choisir une structure existante…" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={onCreateStructure}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Si la structure n'existe pas, créez-la avec le bouton +.
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
              <Label>Nom *</Label>
              <Input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Fonction</Label>
              <Input
                placeholder="Conseiller, référent…"
                value={form.fonction}
                onChange={(e) => setForm({ ...form, fonction: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Thématiques de la personne</Label>
            <div className="rounded-md border border-border bg-muted/20 p-3 grid sm:grid-cols-2 gap-2">
              {themes.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={!!selThemes[t.id]}
                    onCheckedChange={() =>
                      setSelThemes((s) => ({ ...s, [t.id]: !s[t.id] }))
                    }
                  />
                  <span>{t.libelle}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{item.id ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StructureDialog({
  item,
  territoires,
  onClose,
  onSaved,
}: {
  item: any;
  territoires: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({
    nom: item.nom ?? "",
    type: item.type ?? "",
    adresse: item.adresse ?? "",
    code_postal: item.code_postal ?? "",
    ville: item.ville ?? "",
    telephone: item.telephone ?? "",
    email: item.email ?? "",
    site_web: item.site_web ?? "",
    territoire_id: item.territoire_id ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      territoire_id: form.territoire_id || null,
      site_web: form.site_web || null,
      email: form.email || null,
      telephone: form.telephone || null,
    };
    if (item.id) {
      const { error } = await supabase
        .from("partenaire_structures")
        .update(payload)
        .eq("id", item.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("partenaire_structures").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(item.id ? "Structure mise à jour" : "Structure créée");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Modifier la structure" : "Nouvelle structure"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nom *</Label>
              <Input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                placeholder="CAF, Mission locale, Asso…"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div>
              <Label>Territoire</Label>
              <Select
                value={form.territoire_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, territoire_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {territoires.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
            <div>
              <Label>Code postal</Label>
              <Input
                value={form.code_postal}
                onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Site web</Label>
              <Input
                placeholder="https://…"
                value={form.site_web}
                onChange={(e) => setForm({ ...form, site_web: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{item.id ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
