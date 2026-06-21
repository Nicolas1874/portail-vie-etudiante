/**
 * Vue admin des demandes d'évolution : modifier statut + écrire une réponse.
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/labels";

export const Route = createFileRoute("/_app/admin/demandes-evolution")({
  component: AdminDemandesEvolutionPage,
});

const STATUTS = [
  { v: "nouvelle", l: "Nouvelle" },
  { v: "etude", l: "À l'étude" },
  { v: "planifiee", l: "Planifiée" },
  { v: "livree", l: "Livrée" },
  { v: "refusee", l: "Refusée" },
];

function AdminDemandesEvolutionPage() {
  const { isAdmin, loading, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, { statut: string; reponse_admin: string }>>({});

  const refresh = async () => {
    const { data } = await supabase
      .from("feature_requests" as never)
      .select("*, profiles:cree_par(prenom, nom, email)")
      .order("created_at", { ascending: false });
    setRows((data as any[]) ?? []);
  };

  useEffect(() => { if (isAdmin) void refresh(); }, [isAdmin]);

  if (loading) return <div className="p-8">Chargement…</div>;
  if (!isAdmin) return <Navigate to="/" />;

  const save = async (r: any) => {
    const patch = edits[r.id] ?? { statut: r.statut, reponse_admin: r.reponse_admin ?? "" };
    const { error } = await supabase
      .from("feature_requests" as never)
      .update({
        statut: patch.statut,
        reponse_admin: patch.reponse_admin || null,
        traite_par: user?.id ?? null,
        date_traitement: new Date().toISOString(),
      } as never)
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande mise à jour");
    setEdits((e) => { const c = { ...e }; delete c[r.id]; return c; });
    void refresh();
  };

  return (
    <div>
      <PageHeader title="Demandes d'évolution — Admin" description="Modérer, répondre et changer le statut des demandes utilisateurs." />
      <div className="p-6 space-y-3">
        {rows.length === 0 && <Card className="p-12 text-center text-muted-foreground">Aucune demande.</Card>}
        {rows.map((r) => {
          const e = edits[r.id] ?? { statut: r.statut, reponse_admin: r.reponse_admin ?? "" };
          const update = (patch: Partial<typeof e>) => setEdits((s) => ({ ...s, [r.id]: { ...e, ...patch } }));
          const dirty = e.statut !== r.statut || (e.reponse_admin ?? "") !== (r.reponse_admin ?? "");
          const auteur = r.profiles ? `${r.profiles.prenom ?? ""} ${r.profiles.nom ?? ""}`.trim() : "—";
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3 mb-2 flex-wrap">
                <h3 className="font-display font-semibold flex-1">{r.titre}</h3>
                {r.module && <Badge variant="outline">{r.module}</Badge>}
                <span className="text-xs text-muted-foreground">{auteur} · {formatDate(r.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{r.description}</p>

              <div className="grid md:grid-cols-[200px_1fr] gap-3">
                <Select value={e.statut} onValueChange={(v) => update({ statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUTS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={2}
                  placeholder="Réponse / commentaire visible par les utilisateurs"
                  value={e.reponse_admin}
                  onChange={(ev) => update({ reponse_admin: ev.target.value })}
                />
              </div>
              {dirty && (
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={() => save(r)}>Enregistrer</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
