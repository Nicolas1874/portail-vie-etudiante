import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/_app/admin/territoires")({
  component: TerritoiresPage,
});

function TerritoiresPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase.from("territoires").select("*").order("nom");
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string, nom: string) => {
    const { error } = await supabase.from("territoires").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Territoire « ${nom} » supprimé`);
      load();
    }
  };

  return (
    <div>
      <PageHeader
        title="Territoires"
        description="Zones géographiques de cloisonnement des données."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau territoire
          </Button>
        }
      />
      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 data-table">
              <tr>
                <th className="text-left px-4 py-3">Nom</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Département</th>
                <th className="text-left px-4 py-3">Publics accueillis</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const publics = [
                  r.accueille_etudiant && "Étudiants",
                  r.accueille_pij && "PIJ",
                  r.accueille_paej && "PAEJ",
                ].filter(Boolean).join(" · ") || "—";
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.nom}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3">{r.departement ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{publics}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDelete
                          title={`Supprimer « ${r.nom} » ?`}
                          description="Toutes les structures et usagers rattachés à ce territoire seront aussi supprimés. Action irréversible."
                          onConfirm={() => remove(r.id, r.nom)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
      {editing !== null && (
        <EditDialog
          item={editing}
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

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    nom: item.nom ?? "",
    code: item.code ?? "",
    departement: item.departement ?? "",
    accueille_etudiant: item.accueille_etudiant ?? true,
    accueille_pij: item.accueille_pij ?? false,
    accueille_paej: item.accueille_paej ?? false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.accueille_etudiant && !f.accueille_pij && !f.accueille_paej) {
      return toast.error("Cochez au moins un public accueilli.");
    }
    const payload = {
      nom: f.nom,
      code: f.code,
      departement: f.departement || null,
      accueille_etudiant: f.accueille_etudiant,
      accueille_pij: f.accueille_pij,
      accueille_paej: f.accueille_paej,
    };
    if (item.id) {
      const { error } = await supabase.from("territoires").update(payload).eq("id", item.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("territoires").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(item.id ? "Territoire mis à jour" : "Territoire créé");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.id ? "Modifier le territoire" : "Nouveau territoire"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
          </div>
          <div>
            <Label>Code *</Label>
            <Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
          </div>
          <div>
            <Label>Département</Label>
            <Input value={f.departement} onChange={(e) => setF({ ...f, departement: e.target.value })} />
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label>Publics accueillis sur ce territoire *</Label>
            <p className="text-xs text-muted-foreground">
              Détermine les types d'usagers proposés à la création de fiche et les onglets visibles dans le tableau de bord.
            </p>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={f.accueille_etudiant}
                  onCheckedChange={(v) => setF({ ...f, accueille_etudiant: v === true })}
                />
                <span className="text-sm">Étudiants</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={f.accueille_pij}
                  onCheckedChange={(v) => setF({ ...f, accueille_pij: v === true })}
                />
                <span className="text-sm">PIJ — Information jeunesse</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={f.accueille_paej}
                  onCheckedChange={(v) => setF({ ...f, accueille_paej: v === true })}
                />
                <span className="text-sm">PAEJ — Accueil et écoute jeune</span>
              </label>
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
