import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getStructures, saveStructure, deleteStructure } from "@/lib/aide/structures-actions";
import { getTerritoires } from "@/lib/aide/territoires-actions";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil } from "lucide-react";
import { TYPES_STRUCTURE } from "@/lib/aide/labels";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/aide/ConfirmDelete";

export const Route = createFileRoute("/aide/admin/structures")({
  component: StructuresPage,
});

function StructuresPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [territoires, setTerritoires] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const [sRes, tRes] = await Promise.all([
      getStructures(),
      getTerritoires(),
    ]);
    if (sRes.error) toast.error(sRes.error);
    else setRows(sRes.data ?? []);
    
    if (tRes.error) toast.error(tRes.error);
    else setTerritoires(tRes.data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string, nom: string) => {
    const res = await deleteStructure(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success(`Structure « ${nom} » supprimée`);
      load();
    }
  };

  return (
    <div>
      <PageHeader
        title="Structures"
        description="Organismes utilisant l'application (Guichet AIDE, BIJ, CIJ, CAF…)."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle structure
          </Button>
        }
      />
      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 data-table">
              <tr>
                <th className="text-left px-4 py-3">Nom</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Territoire</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.nom}</td>
                  <td className="px-4 py-3">{TYPES_STRUCTURE[r.type] ?? r.type}</td>
                  <td className="px-4 py-3">{r.territoires?.nom ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {r.email_contact ?? "—"}
                    {r.telephone && <div>{r.telephone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ConfirmDelete
                        title={`Supprimer « ${r.nom} » ?`}
                        description="Les utilisateurs rattachés perdront leur structure et toutes les données liées (demandes, accompagnements…) seront supprimées. Action irréversible."
                        onConfirm={() => remove(r.id, r.nom)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {editing !== null && (
        <EditDialog
          item={editing}
          territoires={territoires}
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
  territoires,
  onClose,
  onSaved,
}: {
  item: any;
  territoires: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    nom: item.nom ?? "",
    type: item.type ?? "autre",
    territoire_id: item.territoire_id ?? "",
    email_contact: item.email_contact ?? "",
    telephone: item.telephone ?? "",
    adresse: item.adresse ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.territoire_id) return toast.error("Territoire requis");
    const payload = {
      nom: f.nom,
      type: f.type as any,
      territoire_id: f.territoire_id,
      email_contact: f.email_contact || null,
      telephone: f.telephone || null,
      adresse: f.adresse || null,
    };
    const res = await saveStructure({ ...payload, id: item.id });
    if (res.error) return toast.error(res.error);
    toast.success(item.id ? "Structure mise à jour" : "Structure créée");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Modifier la structure" : "Nouvelle structure"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPES_STRUCTURE).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Territoire *</Label>
            <Select value={f.territoire_id} onValueChange={(v) => setF({ ...f, territoire_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {territoires.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} />
          </div>
          <div>
            <Label>E-mail contact</Label>
            <Input
              type="email"
              value={f.email_contact}
              onChange={(e) => setF({ ...f, email_contact: e.target.value })}
            />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} />
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
