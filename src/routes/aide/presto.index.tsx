import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Mail, CalendarCheck, Check, RefreshCw, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadXlsx } from "@/lib/aide/xlsx-export";
import { toast } from "sonner";
import { fullName, formatDate } from "@/lib/aide/labels";
import {
  PRESTO_STATUTS,
  PRESTO_TYPES,
  PRESTO_MOTIFS,
  type PrestoStatut,
  type PrestoTypePret,
  type PrestoRenewalMotif,
} from "@/lib/aide/presto-labels";
import {
  PrestoStatutBadge,
  PrestoUrgenceBadge,
} from "@/components/aide/presto/PrestoBadges";

export const Route = createFileRoute("/aide/presto/")({
  component: PrestoIndex,
});

interface Row {
  id: string;
  type_pret: PrestoTypePret;
  urgence: number;
  statut: PrestoStatut;
  date_demande: string;
  date_recup: string | null;
  date_retour_prevue: string | null;
  usager_id: string;
  usagers: { nom: string; prenom: string; ville: string | null; email: string | null } | null;
}

function applyTemplate(tpl: string, row: Row, extra: Record<string, string> = {}): string {
  const vars: Record<string, string> = {
    prenom: row.usagers?.prenom ?? "",
    nom: row.usagers?.nom ?? "",
    type_pret: PRESTO_TYPES[row.type_pret],
    date_demande: formatDate(row.date_demande),
    date_retour_prevue: formatDate(row.date_retour_prevue),
    ...extra,
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

interface PendingRenewal {
  id: string;
  request_id: string;
  motif: PrestoRenewalMotif;
  motif_autre: string | null;
  date_demande: string;
}

function PrestoIndex() {
  const { roles, isAdmin } = useAuth();
  const isScd = roles.includes("scd_presto") || isAdmin;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [tab, setTab] = useState<"a_traiter" | "en_cours" | "traites">("a_traiter");
  const [urgenceFilter, setUrgenceFilter] = useState<string>("all");

  // Template (chargé une fois)
  const [tpl, setTpl] = useState<string>("");
  const [tplSubject, setTplSubject] = useState<string>("");
  const [tplAvenant, setTplAvenant] = useState<string>("");
  const [tplAvenantSubject, setTplAvenantSubject] = useState<string>("");

  // Dialog "Marquer ordinateur prêt"
  const [pretRow, setPretRow] = useState<Row | null>(null);
  const [pretSubject, setPretSubject] = useState("");
  const [pretBody, setPretBody] = useState("");
  const [sending, setSending] = useState(false);

  // Dialog "Saisir dates"
  const [dateRow, setDateRow] = useState<Row | null>(null);
  const [dateRecup, setDateRecup] = useState("");
  const [dateRetour, setDateRetour] = useState("");

  // Dialog "Traiter renouvellement"
  const [renewals, setRenewals] = useState<Record<string, PendingRenewal>>({});
  const [renewRow, setRenewRow] = useState<Row | null>(null);
  const [renewPending, setRenewPending] = useState<PendingRenewal | null>(null);
  const [renewNouvelleDate, setRenewNouvelleDate] = useState("");
  const [renewSubject, setRenewSubject] = useState("");
  const [renewBody, setRenewBody] = useState("");
  const [renewSending, setRenewSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("presto_requests")
      .select(
        "id,type_pret,urgence,statut,date_demande,date_recup,date_retour_prevue,usager_id,usagers(nom,prenom,ville,email)",
      )
      .order("urgence", { ascending: false })
      .order("date_demande", { ascending: false })
      .limit(300);
    if (statutFilter !== "all") query = query.eq("statut", statutFilter as PrestoStatut);
    const { data } = await query;
    const list = (data ?? []) as unknown as Row[];
    setRows(list);

    // Récupère renouvellements en attente pour ces demandes
    const pendingIds = list.filter((r) => r.statut === "demande_renouvellement").map((r) => r.id);
    if (pendingIds.length > 0) {
      const { data: rens } = await supabase
        .from("presto_renewals")
        .select("id,request_id,motif,motif_autre,date_demande,statut")
        .in("request_id", pendingIds)
        .eq("statut", "en_attente");
      const map: Record<string, PendingRenewal> = {};
      ((rens ?? []) as PendingRenewal[]).forEach((r) => (map[r.request_id] = r));
      setRenewals(map);
    } else {
      setRenewals({});
    }
    setLoading(false);
  };


  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFilter]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("presto_settings")
        .select("template_mail_dispo,subject_mail_dispo,template_mail_avenant,subject_mail_avenant")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        const d = data as Record<string, string | undefined>;
        setTpl(d.template_mail_dispo ?? "");
        setTplSubject(d.subject_mail_dispo ?? "");
        setTplAvenant(d.template_mail_avenant ?? "");
        setTplAvenantSubject(d.subject_mail_avenant ?? "");
      }
    })();
  }, []);

  const STATUTS_A_TRAITER: PrestoStatut[] = ["demande_creee", "en_attente_preparation", "ordinateur_pret", "demande_renouvellement"];
  const STATUTS_EN_COURS: PrestoStatut[] = ["materiel_recupere", "en_cours_pret", "renouvellement_accepte"];
  const STATUTS_TRAITES: PrestoStatut[] = ["retour_effectue", "cloture", "renouvellement_refuse"];

  const filtered = rows.filter((r) => {
    if (tab === "a_traiter" && !STATUTS_A_TRAITER.includes(r.statut)) return false;
    if (tab === "en_cours" && !STATUTS_EN_COURS.includes(r.statut)) return false;
    if (tab === "traites" && !STATUTS_TRAITES.includes(r.statut)) return false;
    if (urgenceFilter !== "all" && String(r.urgence) !== urgenceFilter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      fullName(r.usagers).toLowerCase().includes(s) ||
      (r.usagers?.ville ?? "").toLowerCase().includes(s)
    );
  });

  const countByTab = {
    a_traiter: rows.filter((r) => STATUTS_A_TRAITER.includes(r.statut)).length,
    en_cours: rows.filter((r) => STATUTS_EN_COURS.includes(r.statut)).length,
    traites: rows.filter((r) => STATUTS_TRAITES.includes(r.statut)).length,
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
  };

  const exportExcel = async () => {
    const { data, error } = await supabase
      .from("presto_requests")
      .select(
        "id,type_pret,urgence,statut,date_demande,date_recup,date_retour_prevue,usager_id,usagers(nom,prenom,ville,email)",
      )
      .order("date_demande", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const all = (data ?? []) as unknown as Row[];
    if (all.length === 0) { toast.error("Aucune ligne à exporter"); return; }
    const out = all.map((r) => ({
      etudiant: fullName(r.usagers),
      campus: r.usagers?.ville ?? "",
      type: PRESTO_TYPES[r.type_pret],
      urgence: r.urgence,
      statut: PRESTO_STATUTS[r.statut],
      date_demande: fmtDate(r.date_demande),
      date_recuperation: fmtDate(r.date_recup),
      date_retour_prevue: fmtDate(r.date_retour_prevue),
      email: r.usagers?.email ?? "",
    }));
    downloadXlsx(`presto_tous_${new Date().toISOString().slice(0, 10)}.xlsx`, out);
    toast.success(`${out.length} ligne(s) exportée(s)`);
  };

  const openPret = (r: Row) => {
    setPretRow(r);
    setPretSubject(applyTemplate(tplSubject, r));
    setPretBody(applyTemplate(tpl, r));
  };

  const sendPret = async () => {
    if (!pretRow) return;
    const email = pretRow.usagers?.email;
    if (!email) {
      toast.error("L'étudiant n'a pas d'adresse e-mail enregistrée");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("presto_requests")
      .update({ statut: "ordinateur_pret" })
      .eq("id", pretRow.id);
    if (error) {
      toast.error("Mise à jour impossible : " + error.message);
      setSending(false);
      return;
    }
    await supabase
      .from("presto_notifications_log")
      .insert({ request_id: pretRow.id, kind: "ordinateur_pret_mail" })
      .then(() => undefined);

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      pretSubject,
    )}&body=${encodeURIComponent(pretBody)}`;
    window.location.href = mailto;

    toast.success("Statut mis à jour — votre client e-mail s'ouvre pour envoyer le message");
    setPretRow(null);
    setSending(false);
    void fetchData();
  };

  const openDates = (r: Row) => {
    setDateRow(r);
    setDateRecup(r.date_recup ?? new Date().toISOString().slice(0, 10));
    setDateRetour(r.date_retour_prevue ?? "");
  };

  const saveDates = async () => {
    if (!dateRow) return;
    if (!dateRecup || !dateRetour) {
      toast.error("Les deux dates sont obligatoires");
      return;
    }
    const { error } = await supabase
      .from("presto_requests")
      .update({
        date_recup: dateRecup,
        date_retour_prevue: dateRetour,
        statut: "en_cours_pret",
      })
      .eq("id", dateRow.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dates enregistrées");
    setDateRow(null);
    void fetchData();
  };

  const openRenew = (r: Row) => {
    const pending = renewals[r.id];
    if (!pending) return;
    setRenewRow(r);
    setRenewPending(pending);
    setRenewNouvelleDate("");
    setRenewSubject(applyTemplate(tplAvenantSubject, r));
    setRenewBody(applyTemplate(tplAvenant, r));
  };

  const sendRenew = async () => {
    if (!renewRow || !renewPending) return;
    if (!renewNouvelleDate) {
      toast.error("Renseignez la nouvelle date de retour");
      return;
    }
    const email = renewRow.usagers?.email;
    if (!email) {
      toast.error("L'étudiant n'a pas d'adresse e-mail");
      return;
    }
    setRenewSending(true);

    // Met à jour le renouvellement
    const { error: rErr } = await supabase
      .from("presto_renewals")
      .update({
        statut: "accepte",
        nouvelle_date_retour: renewNouvelleDate,
        date_decision: new Date().toISOString(),
      })
      .eq("id", renewPending.id);
    if (rErr) {
      toast.error(rErr.message);
      setRenewSending(false);
      return;
    }
    // Met à jour la demande PRESTO
    await supabase
      .from("presto_requests")
      .update({ statut: "en_cours_pret", date_retour_prevue: renewNouvelleDate })
      .eq("id", renewRow.id);

    // Log de notification (kind unique par renouvellement)
    await supabase
      .from("presto_notifications_log")
      .insert({ request_id: renewRow.id, kind: `avenant_mail:${renewPending.id}` })
      .then(() => undefined);

    // Applique la nouvelle date au corps/objet juste avant l'envoi
    const finalSubject = applyTemplate(renewSubject, renewRow, {
      nouvelle_date_retour: formatDate(renewNouvelleDate),
    });
    const finalBody = applyTemplate(renewBody, renewRow, {
      nouvelle_date_retour: formatDate(renewNouvelleDate),
    });

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      finalSubject,
    )}&body=${encodeURIComponent(finalBody)}`;
    window.location.href = mailto;

    toast.success("Renouvellement accepté — mail prêt à être envoyé");
    setRenewRow(null);
    setRenewPending(null);
    setRenewSending(false);
    void fetchData();
  };

  const showNameAsLink = !roles.includes("scd_presto") || isAdmin;

  return (
    <div>
      <PageHeader
        title="PRESTO — Suivi des prêts"
        description="Tableau de bord des prêts d'ordinateurs (PC / Chromebook)."
      />
      <div className="p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="a_traiter">À traiter ({countByTab.a_traiter})</TabsTrigger>
            <TabsTrigger value="en_cours">En cours ({countByTab.en_cours})</TabsTrigger>
            <TabsTrigger value="traites">Traités ({countByTab.traites})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher étudiant ou campus…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={urgenceFilter} onValueChange={setUrgenceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Urgence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes urgences</SelectItem>
              <SelectItem value="3">Niveau 3 — Urgent</SelectItem>
              <SelectItem value="2">Niveau 2 — Pressant</SelectItem>
              <SelectItem value="1">Niveau 1 — Normal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PRESTO_STATUTS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1.5" />
            Exporter Excel
          </Button>
          <Link to="/presto/parametres" className="text-sm text-primary hover:underline">Paramètres</Link>
          <Link to="/presto/exports" className="text-sm text-primary hover:underline">Exports avancés</Link>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3">Étudiant</th>
                  <th className="text-left px-4 py-3">Campus</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Urgence</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Demande</th>
                  <th className="text-left px-4 py-3">Retour prévu</th>
                  {isScd && <th className="text-left px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={isScd ? 8 : 7} className="text-center py-12 text-muted-foreground">Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={isScd ? 8 : 7} className="text-center py-16 text-muted-foreground">Aucun prêt.</td></tr>
                ) : (
                  filtered.map((r) => {
                    const canMarkReady = ["demande_creee", "en_attente_preparation"].includes(r.statut);
                    const canSetDates = r.statut === "ordinateur_pret";
                    return (
                      <tr key={r.id} className="hover:bg-muted/40 align-top">
                        <td className="px-4 py-3 font-medium">
                          {showNameAsLink ? (
                            <Link to="/usagers/$id" params={{ id: r.usager_id }} className="hover:text-primary">
                              {fullName(r.usagers)}
                            </Link>
                          ) : (
                            <span>{fullName(r.usagers)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.usagers?.ville ?? "—"}</td>
                        <td className="px-4 py-3">{PRESTO_TYPES[r.type_pret]}</td>
                        <td className="px-4 py-3"><PrestoUrgenceBadge niveau={r.urgence} /></td>
                        <td className="px-4 py-3"><PrestoStatutBadge statut={r.statut} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date_demande)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date_retour_prevue)}</td>
                        {isScd && (
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5 min-w-[200px]">
                              {canMarkReady && (
                                <Button size="sm" variant="outline" onClick={() => openPret(r)}>
                                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                                  Ordinateur prêt — envoyer le mail
                                </Button>
                              )}
                              {canSetDates && (
                                <Button size="sm" onClick={() => openDates(r)}>
                                  <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                                  Saisir les dates
                                </Button>
                              )}
                              {r.statut === "demande_renouvellement" && renewals[r.id] && (
                                <Button size="sm" variant="outline" onClick={() => openRenew(r)}>
                                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                  Traiter le renouvellement
                                </Button>
                              )}
                              {r.statut === "en_cours_pret" && (
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <Check className="h-3 w-3 text-success" />
                                  Prêt en cours
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Dialog: Ordinateur prêt + envoi mail */}
      <Dialog open={!!pretRow} onOpenChange={(o) => !o && setPretRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Marquer l'ordinateur comme prêt</DialogTitle>
            <DialogDescription>
              Le statut passera à « Ordinateur prêt » et un e-mail prérempli sera envoyé à
              l'étudiant. Vous pouvez modifier l'objet et le contenu avant l'envoi.
            </DialogDescription>
          </DialogHeader>
          {pretRow && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <div><span className="text-muted-foreground">Destinataire&nbsp;:</span> {fullName(pretRow.usagers)} — <span className="font-mono">{pretRow.usagers?.email ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Type&nbsp;:</span> {PRESTO_TYPES[pretRow.type_pret]}</div>
              </div>
              <div className="space-y-1.5">
                <Label>Objet</Label>
                <Input value={pretSubject} onChange={(e) => setPretSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea rows={10} value={pretBody} onChange={(e) => setPretBody(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Pour modifier le modèle par défaut, rendez-vous dans <strong>Paramètres SCD</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPretRow(null)} disabled={sending}>Annuler</Button>
            <Button onClick={sendPret} disabled={sending || !pretRow?.usagers?.email}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Envoyer & marquer prêt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Saisie des dates */}
      <Dialog open={!!dateRow} onOpenChange={(o) => !o && setDateRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saisir les dates du prêt</DialogTitle>
            <DialogDescription>
              Date à laquelle l'étudiant est venu récupérer l'ordinateur, et date prévisionnelle de retour.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date de venue (prise du PC)</Label>
              <Input type="date" value={dateRecup} onChange={(e) => setDateRecup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date prévisionnelle de retour</Label>
              <Input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateRow(null)}>Annuler</Button>
            <Button onClick={saveDates}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Traiter le renouvellement */}
      <Dialog
        open={!!renewRow}
        onOpenChange={(o) => {
          if (!o) {
            setRenewRow(null);
            setRenewPending(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Accepter le renouvellement</DialogTitle>
            <DialogDescription>
              Choisissez la nouvelle date de retour. Un e-mail prérempli sera ensuite envoyé à
              l'étudiant pour l'informer que l'avenant est prêt.
            </DialogDescription>
          </DialogHeader>
          {renewRow && renewPending && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-0.5">
                <div>
                  <span className="text-muted-foreground">Étudiant&nbsp;:</span>{" "}
                  {fullName(renewRow.usagers)} —{" "}
                  <span className="font-mono">{renewRow.usagers?.email ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Motif&nbsp;:</span>{" "}
                  {PRESTO_MOTIFS[renewPending.motif]}
                  {renewPending.motif_autre && ` — ${renewPending.motif_autre}`}
                </div>
                <div>
                  <span className="text-muted-foreground">Demandé le&nbsp;:</span>{" "}
                  {formatDate(renewPending.date_demande)}
                </div>
                <div>
                  <span className="text-muted-foreground">Retour prévu actuel&nbsp;:</span>{" "}
                  {formatDate(renewRow.date_retour_prevue)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nouvelle date de retour *</Label>
                <Input
                  type="date"
                  value={renewNouvelleDate}
                  onChange={(e) => setRenewNouvelleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objet</Label>
                <Input value={renewSubject} onChange={(e) => setRenewSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  rows={9}
                  value={renewBody}
                  onChange={(e) => setRenewBody(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La variable <code className="font-mono">{`{nouvelle_date_retour}`}</code> est
                remplacée automatiquement par la date choisie.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenewRow(null);
                setRenewPending(null);
              }}
              disabled={renewSending}
            >
              Annuler
            </Button>
            <Button
              onClick={sendRenew}
              disabled={renewSending || !renewRow?.usagers?.email || !renewNouvelleDate}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Accepter & envoyer le mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
