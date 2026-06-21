import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Trash2, Plus, AlertTriangle, Play } from "lucide-react";

export const Route = createFileRoute("/aide/admin/rgpd")({
  component: AdminRgpdPage,
});

type Registre = {
  id: string;
  titre: string;
  finalite: string;
  base_legale: string;
  categories_donnees: string;
  destinataires: string | null;
  duree_conservation: string;
  mesures_securite: string | null;
  ordre: number;
};

type Candidat = {
  id: string;
  nom: string;
  prenom: string;
  derniere_activite: string;
};

function AdminRgpdPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [registre, setRegistre] = useState<Registre[]>([]);
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [editing, setEditing] = useState<Registre | null>(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const load = async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("rgpd_registre" as any).select("*").order("ordre"),
      supabase.from("vw_usagers_a_purger" as any)
        .select("id,nom,prenom,derniere_activite")
        .lt("derniere_activite", new Date(Date.now() - 36 * 30 * 24 * 3600 * 1000).toISOString())
        .order("derniere_activite"),
    ]);
    setRegistre((r as any) ?? []);
    setCandidats((c as any) ?? []);
  };

  useEffect(() => { void load(); }, []);

  const saveEntry = async () => {
    if (!editing) return;
    const { id, ...rest } = editing;
    const { error } = id
      ? await (supabase.from("rgpd_registre" as any).update(rest).eq("id", id))
      : await (supabase.from("rgpd_registre" as any).insert(rest));
    if (error) toast.error(error.message);
    else { toast.success("Enregistré"); setEditing(null); void load(); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Supprimer cette entrée du registre ?")) return;
    const { error } = await supabase.from("rgpd_registre" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimé"); void load(); }
  };

  const runPurge = async (dryRun: boolean) => {
    setPurging(true);
    const { data, error } = await (supabase.rpc as any)("purge_old_usagers", { _dry_run: dryRun });
    setPurging(false);
    if (error) toast.error(error.message);
    else {
      const n = (data as any[])?.length ?? 0;
      toast.success(dryRun ? `${n} usager(s) seraient anonymisés` : `${n} usager(s) anonymisés`);
      if (!dryRun) void load();
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div>
      <PageHeader
        title="RGPD"
        description="Registre des traitements & purge automatique 36 mois"
      />
      <div className="p-6 space-y-8">

        {/* Purge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
              Candidats à la purge automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Usagers sans aucune activité depuis 36 mois. Une purge mensuelle automatique est planifiée le 1er de chaque mois.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={purging} onClick={() => runPurge(true)}>
                <Play className="h-4 w-4 mr-2" /> Simulation
              </Button>
              <Button variant="destructive" disabled={purging || candidats.length === 0} onClick={() => {
                if (confirm(`Anonymiser ${candidats.length} usager(s) ? Action irréversible.`)) runPurge(false);
              }}>
                <Trash2 className="h-4 w-4 mr-2" /> Lancer la purge ({candidats.length})
              </Button>
            </div>
            {candidats.length > 0 && (
              <div className="max-h-64 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-2">Nom</th><th className="text-left p-2">Dernière activité</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {candidats.map(c => (
                      <tr key={c.id}>
                        <td className="p-2">{c.prenom} {c.nom}</td>
                        <td className="p-2 text-muted-foreground">{new Date(c.derniere_activite).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registre */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" />
              Registre des traitements
            </CardTitle>
            <Button size="sm" onClick={() => setEditing({
              id: "", titre: "", finalite: "", base_legale: "", categories_donnees: "",
              destinataires: "", duree_conservation: "", mesures_securite: "", ordre: registre.length + 1
            } as Registre)}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {registre.map(r => (
              <div key={r.id} className="border rounded p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{r.titre}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{r.finalite}</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                      <dt className="text-muted-foreground">Base légale</dt><dd>{r.base_legale}</dd>
                      <dt className="text-muted-foreground">Catégories</dt><dd>{r.categories_donnees}</dd>
                      <dt className="text-muted-foreground">Destinataires</dt><dd>{r.destinataires ?? "—"}</dd>
                      <dt className="text-muted-foreground">Conservation</dt><dd>{r.duree_conservation}</dd>
                      <dt className="text-muted-foreground">Sécurité</dt><dd>{r.mesures_securite ?? "—"}</dd>
                    </dl>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Modifier</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteEntry(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouveau"} traitement</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Titre</Label><Input value={editing.titre} onChange={e => setEditing({ ...editing, titre: e.target.value })} /></div>
              <div><Label>Finalité</Label><Textarea value={editing.finalite} onChange={e => setEditing({ ...editing, finalite: e.target.value })} /></div>
              <div><Label>Base légale</Label><Input value={editing.base_legale} onChange={e => setEditing({ ...editing, base_legale: e.target.value })} /></div>
              <div><Label>Catégories de données</Label><Textarea value={editing.categories_donnees} onChange={e => setEditing({ ...editing, categories_donnees: e.target.value })} /></div>
              <div><Label>Destinataires</Label><Input value={editing.destinataires ?? ""} onChange={e => setEditing({ ...editing, destinataires: e.target.value })} /></div>
              <div><Label>Durée de conservation</Label><Input value={editing.duree_conservation} onChange={e => setEditing({ ...editing, duree_conservation: e.target.value })} /></div>
              <div><Label>Mesures de sécurité</Label><Textarea value={editing.mesures_securite ?? ""} onChange={e => setEditing({ ...editing, mesures_securite: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveEntry}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
