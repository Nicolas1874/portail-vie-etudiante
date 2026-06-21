import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Laptop, RefreshCw, Check, X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/labels";
import {
  PRESTO_TYPES,
  PRESTO_MOTIFS,
  type PrestoStatut,
  type PrestoTypePret,
  type PrestoRenewalMotif,
} from "@/lib/presto-labels";
import { PrestoStatutBadge, PrestoUrgenceBadge } from "./PrestoBadges";

interface Request {
  id: string;
  usager_id: string;
  type_pret: PrestoTypePret;
  urgence: number;
  statut: PrestoStatut;
  observation: string | null;
  date_demande: string;
  date_recup: string | null;
  date_retour_prevue: string | null;
  date_retour_effectif: string | null;
  created_at: string;
}

interface Renewal {
  id: string;
  request_id: string;
  motif: PrestoRenewalMotif;
  motif_autre: string | null;
  nouvelle_date_retour: string | null;
  statut: "en_attente" | "accepte" | "refuse";
  date_demande: string;
  date_decision: string | null;
  commentaire: string | null;
}

import { logSollicitationBesoin } from "@/lib/presto-sollicitation";
import { PRESTO_TYPES as PRESTO_TYPES_FOR_TITLE } from "@/lib/presto-labels";

export function PrestoTab({ usagerId }: { usagerId: string }) {
  const { user, profile, roles, isAdmin } = useAuth();
  const isScd = roles.includes("scd_presto");
  const isAide =
    isAdmin ||
    roles.includes("agent") ||
    roles.includes("superviseur") ||
    roles.includes("prescripteur");

  const [requests, setRequests] = useState<Request[]>([]);
  const [renewals, setRenewals] = useState<Record<string, Renewal[]>>({});
  const [loading, setLoading] = useState(true);

  // New request form
  const [openNew, setOpenNew] = useState(false);
  const [typePret, setTypePret] = useState<PrestoTypePret>("pc");
  const [urgence, setUrgence] = useState("1");
  const [observation, setObservation] = useState("");

  // Renewal form
  const [openRenew, setOpenRenew] = useState<string | null>(null);
  const [motif, setMotif] = useState<PrestoRenewalMotif>("stage");
  const [motifAutre, setMotifAutre] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("presto_requests")
      .select("*")
      .eq("usager_id", usagerId)
      .order("date_demande", { ascending: false });
    const reqList = (reqs ?? []) as Request[];
    setRequests(reqList);

    if (reqList.length > 0) {
      const { data: rens } = await supabase
        .from("presto_renewals")
        .select("*")
        .in(
          "request_id",
          reqList.map((r) => r.id),
        )
        .order("date_demande", { ascending: false });
      const grouped: Record<string, Renewal[]> = {};
      ((rens ?? []) as Renewal[]).forEach((r) => {
        (grouped[r.request_id] ??= []).push(r);
      });
      setRenewals(grouped);
    } else {
      setRenewals({});
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usagerId]);

  const createRequest = async () => {
    if (!user) return;
    const { error } = await supabase.from("presto_requests").insert({
      usager_id: usagerId,
      type_pret: typePret,
      urgence: Number(urgence),
      observation: observation.trim() || null,
      created_by: user.id,
    });
    if (error) {
      toast.error("Création impossible : " + error.message);
      return;
    }
    // Crée automatiquement une sollicitation « numérique »
    const { error: sErr } = await logSollicitationBesoin({
      usagerId,
      structureId: profile?.structure_id ?? null,
      creePar: user.id,
      besoinCode: "etu_numerique",
      typologie: "numerique",
      titre: `Demande PRESTO — ${PRESTO_TYPES_FOR_TITLE[typePret]}`,
      description: observation.trim() || null,
    });
    if (sErr) toast.warning("Demande PRESTO créée, mais sollicitation : " + sErr);
    else toast.success("Demande PRESTO créée — le SCD a été notifié");
    setOpenNew(false);
    setObservation("");
    setUrgence("1");
    setTypePret("pc");
    void fetchData();
  };

  const updateStatut = async (id: string, statut: PrestoStatut, extra: Partial<Request> = {}) => {
    const { error } = await supabase
      .from("presto_requests")
      .update({ statut, ...extra })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mise à jour effectuée");
    void fetchData();
  };

  const setRecup = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const date = window.prompt("Date de prise du PC (AAAA-MM-JJ) :", today);
    if (!date) return;
    await updateStatut(id, "en_cours_pret", { date_recup: date });
  };

  const setRetour = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const date = window.prompt("Date de retour effectif (AAAA-MM-JJ) :", today);
    if (!date) return;
    await updateStatut(id, "retour_effectue", { date_retour_effectif: date });
  };

  const submitRenewal = async () => {
    if (!openRenew || !user) return;
    if (motif === "autre" && !motifAutre.trim()) {
      toast.error("Précisez le motif");
      return;
    }
    const { error } = await supabase.from("presto_renewals").insert({
      request_id: openRenew,
      motif,
      motif_autre: motif === "autre" ? motifAutre.trim() : null,
      demande_par: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("presto_requests")
      .update({ statut: "demande_renouvellement" })
      .eq("id", openRenew);
    toast.success("Demande de renouvellement envoyée au SCD");
    setOpenRenew(null);
    setMotif("stage");
    setMotifAutre("");
    void fetchData();
  };

  const decideRenewal = async (
    renewalId: string,
    requestId: string,
    decision: "accepte" | "refuse",
  ) => {
    let nouvelleDate: string | null = null;
    let dateRenouv: string | null = null;
    if (decision === "accepte") {
      const today = new Date().toISOString().slice(0, 10);
      const d1 = window.prompt("Date de renouvellement (AAAA-MM-JJ) :", today);
      if (!d1) return;
      dateRenouv = d1;
      const d2 = window.prompt("Date de retour du renouvellement (AAAA-MM-JJ) :", "");
      if (!d2) return;
      nouvelleDate = d2;
    }
    const { error } = await supabase
      .from("presto_renewals")
      .update({
        statut: decision,
        date_decision: dateRenouv ? `${dateRenouv}T00:00:00Z` : new Date().toISOString(),
        decided_by: user?.id ?? null,
        nouvelle_date_retour: nouvelleDate,
      })
      .eq("id", renewalId);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (decision === "accepte") {
      await supabase
        .from("presto_requests")
        .update({ statut: "en_cours_pret", date_retour_prevue: nouvelleDate })
        .eq("id", requestId);
    } else {
      await supabase
        .from("presto_requests")
        .update({ statut: "renouvellement_refuse" })
        .eq("id", requestId);
    }
    toast.success(decision === "accepte" ? "Renouvellement accepté" : "Renouvellement refusé");
    void fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Laptop className="h-4 w-4 text-primary" />
            Prêts PRESTO
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestion des prêts d'ordinateurs en lien avec le SCD.
          </p>
        </div>
        {isAide && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle demande PRESTO</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de prêt</Label>
                  <Select value={typePret} onValueChange={(v) => setTypePret(v as PrestoTypePret)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESTO_TYPES).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Niveau d'urgence</Label>
                  <Select value={urgence} onValueChange={setUrgence}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Niveau 1 — Normal</SelectItem>
                      <SelectItem value="2">Niveau 2 — Pressant</SelectItem>
                      <SelectItem value="3">Niveau 3 — Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observation</Label>
                  <Textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    rows={4}
                    placeholder="Contexte, besoin particulier…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>Annuler</Button>
                <Button onClick={createRequest}>Créer la demande</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Aucune demande PRESTO pour cet étudiant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const rens = renewals[r.id] ?? [];
            const pendingRen = rens.find((x) => x.statut === "en_attente");
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PrestoStatutBadge statut={r.statut} />
                      <PrestoUrgenceBadge niveau={r.urgence} />
                      <span className="text-sm font-medium">{PRESTO_TYPES[r.type_pret]}</span>
                      <span className="text-xs text-muted-foreground">
                        Demande du {formatDateTime(r.date_demande)}
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2 text-xs">
                    <KV label="Récupération" value={formatDate(r.date_recup)} />
                    <KV label="Retour prévu" value={formatDate(r.date_retour_prevue)} />
                    <KV label="Retour effectif" value={formatDate(r.date_retour_effectif)} />
                  </div>

                  {r.observation && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-border pl-3">
                      {r.observation}
                    </p>
                  )}

                  {pendingRen && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
                      <div className="font-medium text-warning-foreground flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5" /> Demande de renouvellement
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Motif&nbsp;: {PRESTO_MOTIFS[pendingRen.motif]}
                        {pendingRen.motif_autre ? ` — ${pendingRen.motif_autre}` : ""}
                        {" · "}déposée le {formatDate(pendingRen.date_demande)}
                      </div>
                      {isScd && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => decideRenewal(pendingRen.id, r.id, "accepte")}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decideRenewal(pendingRen.id, r.id, "refuse")}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {isScd && ["demande_creee", "en_attente_preparation", "ordinateur_pret"].includes(r.statut) && !r.date_recup && (
                      <Button size="sm" variant="outline" onClick={() => setRecup(r.id)}>
                        <Calendar className="h-3.5 w-3.5 mr-1" /> Saisir la date de prise du PC
                      </Button>
                    )}
                    {isScd && (r.statut === "en_cours_pret" || r.statut === "renouvellement_accepte") && !r.date_retour_effectif && (
                      <Button size="sm" variant="outline" onClick={() => setRetour(r.id)}>
                        <Calendar className="h-3.5 w-3.5 mr-1" /> Saisir la date de retour effectif
                      </Button>
                    )}
                    {isAide && ["en_cours_pret", "renouvellement_accepte"].includes(r.statut) && !pendingRen && (
                      <Button size="sm" variant="outline" onClick={() => setOpenRenew(r.id)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Demander un renouvellement
                      </Button>
                    )}
                    {isAide && r.statut === "retour_effectue" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatut(r.id, "cloture")}>
                        Clôturer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!openRenew} onOpenChange={(o) => !o && setOpenRenew(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demande de renouvellement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motif</Label>
              <div className="space-y-2">
                {(Object.keys(PRESTO_MOTIFS) as PrestoRenewalMotif[]).map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={motif === m}
                      onCheckedChange={() => setMotif(m)}
                    />
                    {PRESTO_MOTIFS[m]}
                  </label>
                ))}
              </div>
            </div>
            {motif === "autre" && (
              <div className="space-y-2">
                <Label>Précisez</Label>
                <Input value={motifAutre} onChange={(e) => setMotifAutre(e.target.value)} required />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRenew(null)}>Annuler</Button>
            <Button onClick={submitRenewal}>Envoyer au SCD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}
