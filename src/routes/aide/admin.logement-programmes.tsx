import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { LOGEMENT_PROGRAMMES } from "@/lib/labels";
import { Plus, Home, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/aide/admin/logement-programmes")({
  component: AdminLogementProgrammes,
});

type Territoire = { id: string; nom: string; code: string };
type Programme = {
  id: string;
  territoire_id: string | null;
  type: string;
  nom: string;
  description: string | null;
  actif: boolean;
};

function AdminLogementProgrammes() {
  const { isAdmin } = useAuth();
  const [territoires, setTerritoires] = useState<Territoire[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Programme> | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("territoires").select("id, nom, code").order("nom"),
      supabase.from("logement_programmes").select("*").order("created_at"),
    ]);
    setTerritoires((t.data ?? []) as any);
    setProgrammes((p.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  const toggle = async (prog: Programme) => {
    const { error } = await supabase
      .from("logement_programmes")
      .update({ actif: !prog.actif })
      .eq("id", prog.id);
    if (error) toast.error(error.message);
    else {
      toast.success(prog.actif ? "Programme désactivé" : "Programme activé");
      refresh();
    }
  };

  const remove = async (prog: Programme) => {
    const { error } = await supabase
      .from("logement_programmes")
      .delete()
      .eq("id", prog.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Programme supprimé");
      refresh();
    }
  };

  const renderProgList = (list: Programme[]) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground italic">
        Aucun programme défini.
      </p>
    ) : (
      <div className="space-y-2">
        {list.map((p) => (
          <div
            key={p.id}
            className="flex items-start justify-between gap-3 p-3 rounded-md border border-border"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {p.nom}{" "}
                <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                  {LOGEMENT_PROGRAMMES[p.type] ?? p.type}
                </Badge>
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                  {p.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {p.actif ? "Actif" : "Inactif"}
              </span>
              <Switch checked={p.actif} onCheckedChange={() => toggle(p)} />
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <ConfirmDelete
                title={`Supprimer « ${p.nom} » ?`}
                description="Les dossiers logement liés à ce programme deviendront orphelins. Action irréversible."
                onConfirm={() => remove(p)}
              />
            </div>
          </div>
        ))}
      </div>
    );

  const globaux = programmes.filter((p) => !p.territoire_id);

  return (
    <div>
      <PageHeader
        title="Programmes Logement"
        description="Programmes globaux ou rattachés à un territoire."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau programme
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Chargement…</div>
        ) : (
          <>
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Tous territoires (global)</h3>
                </div>
                {renderProgList(globaux)}
              </CardContent>
            </Card>
            {territoires.map((terr) => (
              <Card key={terr.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{terr.nom}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {terr.code}
                    </Badge>
                  </div>
                  {renderProgList(programmes.filter((p) => p.territoire_id === terr.id))}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
      {editing !== null && (
        <ProgDialog
          item={editing}
          territoires={territoires}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ProgDialog({
  item,
  territoires,
  onClose,
  onSaved,
}: {
  item: Partial<Programme>;
  territoires: Territoire[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [territoireId, setTerritoireId] = useState<string>(item.territoire_id ?? "__all__");
  const [type, setType] = useState(item.type ?? "urgence_ytineraire");
  const [nom, setNom] = useState(item.nom ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [saving, setSaving] = useState(false);

  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [referents, setReferents] = useState<any[]>([]);
  const [newRefRole, setNewRefRole] = useState("");
  const [newRefPartId, setNewRefPartId] = useState("__none__");

  useEffect(() => {
    supabase
      .from("partenaires")
      .select("id, prenom, nom, structure_partenaire_id, partenaire_structures(nom)")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setPartenaires(data ?? []));
    if (item.id) {
      supabase
        .from("logement_programmes_partenaires")
        .select("*, partenaires(prenom, nom, partenaire_structures(nom))")
        .eq("programme_id", item.id)
        .order("ordre")
        .then(({ data }) => setReferents(data ?? []));
    }
  }, [item.id]);

  const submit = async () => {
    if (!nom.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    const payload = {
      territoire_id: territoireId === "__all__" ? null : territoireId,
      type: type as "urgence_ytineraire" | "hebergement_court",
      nom: nom.trim(),
      description: description.trim() || null,
    };
    const { error } = item.id
      ? await supabase.from("logement_programmes").update(payload).eq("id", item.id)
      : await supabase.from("logement_programmes").insert({ ...payload, actif: true });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(item.id ? "Programme mis à jour" : "Programme créé");
      onSaved();
    }
  };

  const addReferent = async () => {
    if (!item.id || !newRefRole.trim()) {
      toast.error("Libellé du rôle requis");
      return;
    }
    const { error } = await supabase.from("logement_programmes_partenaires").insert({
      programme_id: item.id,
      role_libelle: newRefRole.trim(),
      partenaire_id: newRefPartId === "__none__" ? null : newRefPartId,
      ordre: referents.length,
    });
    if (error) return toast.error(error.message);
    setNewRefRole("");
    setNewRefPartId("__none__");
    const { data } = await supabase
      .from("logement_programmes_partenaires")
      .select("*, partenaires(prenom, nom, partenaire_structures(nom))")
      .eq("programme_id", item.id)
      .order("ordre");
    setReferents(data ?? []);
  };

  const removeReferent = async (id: string) => {
    await supabase.from("logement_programmes_partenaires").delete().eq("id", id);
    setReferents((r) => r.filter((x) => x.id !== id));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Modifier le programme" : "Nouveau programme logement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Territoire</Label>
            <Select value={territoireId} onValueChange={setTerritoireId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous territoires (global)</SelectItem>
                {territoires.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type de programme</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOGEMENT_PROGRAMMES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nom (interne)</Label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Parcours Ytinéraire 2026"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {item.id && (
            <div className="border-t pt-4 space-y-2">
              <Label className="text-base">Référents partenaires affichés sur la fiche</Label>
              <p className="text-xs text-muted-foreground">
                Ces encarts apparaîtront sur chaque dossier de ce programme — même non remplis — pour
                que l'usager (et les pros) sachent qui sera son interlocuteur.
              </p>
              <div className="space-y-2 mt-2">
                {referents.length === 0 && (
                  <p className="text-xs italic text-muted-foreground">Aucun référent défini.</p>
                )}
                {referents.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 border rounded p-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{r.role_libelle}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.partenaires
                          ? `${[r.partenaires.prenom, r.partenaires.nom].filter(Boolean).join(" ")}${r.partenaires.partenaire_structures ? " · " + r.partenaires.partenaire_structures.nom : ""}`
                          : "Sans contact assigné"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeReferent(r.id)}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end mt-2">
                <div>
                  <Label className="text-xs">Rôle / libellé *</Label>
                  <Input
                    value={newRefRole}
                    onChange={(e) => setNewRefRole(e.target.value)}
                    placeholder="Ex : Guichet AIDE, Ytinéraire, CCAS…"
                  />
                </div>
                <div>
                  <Label className="text-xs">Contact partenaire (optionnel)</Label>
                  <Select value={newRefPartId} onValueChange={setNewRefPartId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Sans contact —</SelectItem>
                      {partenaires.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {[p.prenom, p.nom].filter(Boolean).join(" ")}
                          {p.partenaire_structures ? ` (${p.partenaire_structures.nom})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={addReferent}>
                  Ajouter
                </Button>
              </div>
            </div>
          )}
          {!item.id && (
            <p className="text-xs text-muted-foreground italic">
              Astuce : créez d'abord le programme, puis rouvrez-le pour ajouter ses référents partenaires.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            {item.id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
