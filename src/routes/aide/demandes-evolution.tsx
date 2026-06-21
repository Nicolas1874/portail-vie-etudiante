/**
 * Module "Demandes d'évolution" — formulaire pour suggérer des évolutions du SI.
 * Tout utilisateur authentifié peut soumettre, voter, et suivre l'avancement.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Lightbulb, Plus, ThumbsUp, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/labels";

export const Route = createFileRoute("/aide/demandes-evolution")({
  component: DemandesEvolutionPage,
});

const STATUT_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
  nouvelle: { label: "Nouvelle", tone: "secondary" },
  etude: { label: "À l'étude", tone: "outline" },
  planifiee: { label: "Planifiée", tone: "default" },
  livree: { label: "Livrée", tone: "default" },
  refusee: { label: "Refusée", tone: "destructive" },
};

const MODULES = ["Usagers", "Suivis", "Demandes", "Rendez-vous", "Coups de pouce", "Dons", "Logement", "Ateliers", "Annuaire", "Exports", "Admin / paramétrage", "Autre"];

function DemandesEvolutionPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("toutes");
  const [openNew, setOpenNew] = useState(false);

  const refresh = async () => {
    const [{ data: fr }, { data: v }] = await Promise.all([
      supabase.from("feature_requests" as never).select("*, profiles:cree_par(prenom, nom)").order("created_at", { ascending: false }),
      supabase.from("feature_request_votes" as never).select("*"),
    ]);
    setRows((fr as any[]) ?? []);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    ((v as any[]) ?? []).forEach((vote) => {
      counts[vote.feature_request_id] = (counts[vote.feature_request_id] ?? 0) + 1;
      if (vote.user_id === user?.id) mine.add(vote.feature_request_id);
    });
    setVotes(counts);
    setMyVotes(mine);
  };

  useEffect(() => { void refresh(); }, [user?.id]);

  const toggleVote = async (id: string) => {
    if (!user) return;
    if (myVotes.has(id)) {
      await supabase.from("feature_request_votes" as never).delete().eq("feature_request_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("feature_request_votes" as never).insert({ feature_request_id: id, user_id: user.id } as never);
    }
    void refresh();
  };

  const filtered = filter === "toutes" ? rows : rows.filter((r) => r.statut === filter);

  return (
    <div>
      <PageHeader
        title="Demandes d'évolution"
        description="Suggérez de nouvelles fonctionnalités ou des améliorations. Votez pour celles qui vous tiennent à cœur."
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouvelle demande</Button>
            </DialogTrigger>
            <NewRequestDialog onCreated={() => { setOpenNew(false); void refresh(); }} />
          </Dialog>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex gap-2 items-center">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtre statut</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes</SelectItem>
              {Object.entries(STATUT_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Aucune demande pour ce filtre.
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = STATUT_LABEL[r.statut] ?? STATUT_LABEL.nouvelle;
              const auteur = r.profiles ? `${r.profiles.prenom ?? ""} ${r.profiles.nom ?? ""}`.trim() : "—";
              const voted = myVotes.has(r.id);
              return (
                <Card key={r.id} className="p-4 flex gap-4">
                  <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                    <Button
                      size="sm"
                      variant={voted ? "default" : "outline"}
                      className="w-full"
                      onClick={() => toggleVote(r.id)}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      {votes[r.id] ?? 0}
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <h3 className="font-display font-semibold">{r.titre}</h3>
                      <Badge variant={st.tone}>{st.label}</Badge>
                      {r.module && <Badge variant="outline">{r.module}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>
                    {r.reponse_admin && (
                      <div className="mt-3 p-3 rounded-md bg-info/10 border border-info/30 text-sm">
                        <div className="flex items-center gap-2 mb-1 font-medium text-info">
                          <MessageSquare className="h-3 w-3" />Réponse de l'admin
                        </div>
                        <div className="whitespace-pre-wrap">{r.reponse_admin}</div>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Soumis par {auteur} · {formatDate(r.created_at)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NewRequestDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titre.trim() || !description.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("feature_requests" as never).insert({
      titre: titre.trim(),
      description: description.trim(),
      module: module || null,
      cree_par: user.id,
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée à l'équipe");
    setTitre(""); setDescription(""); setModule("");
    onCreated();
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Nouvelle demande d'évolution</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-2">
          <Label>Titre *</Label>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Résumé court" maxLength={200} />
        </div>
        <div className="grid gap-2">
          <Label>Module concerné</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger><SelectValue placeholder="— Choisir —" /></SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Description détaillée *</Label>
          <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez le besoin, le contexte, ce que vous attendez…" maxLength={2000} />
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={saving || !titre.trim() || !description.trim()} onClick={submit}>Envoyer</Button>
        </div>
      </div>
    </DialogContent>
  );
}
