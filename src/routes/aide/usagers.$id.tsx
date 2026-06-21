import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// PageHeader retiré : remplacé par UsagerHero (Vague B — Vue 360°)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  ShieldCheck,
  ShieldAlert,
  CalendarPlus,
  StickyNote,
  ListTodo,
  History,
  FileText,
  MessageSquare,
  Package,
  HandCoins,
  Home,
} from "lucide-react";
import {
  GENRES,
  SITUATIONS,
  TYPOLOGIES,
  TYPES_PUBLIC,
  ACCOMPAGNEMENT_PAEJ,
  STATUTS_DEMANDE,
  PRIORITES,
  STATUTS_RDV,
  MODALITES_RDV,
  LOGEMENT_PROGRAMMES,
  LOGEMENT_STATUTS,
  formatDate,
  formatDateTime,
  fullName,
} from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { CoupsPouceTab } from "@/components/CoupsPouceTab";
import { PrestoTab } from "@/components/presto/PrestoTab";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  loadCorrespondance,
  getPromptsForBesoin,
  insertBesoinLinks,
  resolveMirrors,
  type Correspondance,
  type PromptResponses,
} from "@/lib/besoins-correspondance";
import { BesoinPromptDialog } from "@/components/BesoinPromptDialog";
import { dispatchUsagerAction, onUsagerAction, type UsagerActionKind } from "@/lib/usager-shortcuts";
import { UsagerHero } from "@/components/usager/UsagerHero";
import { UsagerTimeline } from "@/components/usager/UsagerTimeline";
import { ReorienterDialog } from "@/components/usager/ReorienterDialog";
import { UsagerSidePanel } from "@/components/usager/UsagerSidePanel";
import { DemandesNonSatisfaitesSection } from "@/components/DemandesNonSatisfaitesSection";

export const Route = createFileRoute("/_app/usagers/$id")({
  component: UsagerDetail,
});

function UsagerDetail() {
  const { id } = Route.useParams();
  // navigate déplacé dans UsagerHero
  const { profile, roles } = useAuth();
  const isScdOnly = roles.length > 0 && roles.every((r) => r === "scd_presto");
  const [activeTab, setActiveTab] = useState(isScdOnly ? "infos" : "parcours");

  // Le SCD n'accède pas aux fiches usagers : redirection vers la liste PRESTO
  useEffect(() => {
    if (isScdOnly) {
      window.location.replace("/presto");
    }
  }, [isScdOnly]);
  if (isScdOnly) return null;

  const [usager, setUsager] = useState<any>(null);
  const [demandes, setDemandes] = useState<any[]>([]);
  const [accomp, setAccomp] = useState<any[]>([]);
  const [rdvs, setRdvs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [suivis, setSuivis] = useState<any[]>([]);
  const [dons, setDons] = useState<any[]>([]);
  const [logementDossiers, setLogementDossiers] = useState<any[]>([]);
  const [coupsPouce, setCoupsPouce] = useState<any[]>([]);
  const [prestoRequests, setPrestoRequests] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Navigation onglet + ancre depuis le panneau latéral / raccourcis clavier
  const jumpTo = (tab: string, anchor?: string) => {
    setActiveTab(tab);
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  // Compat : composants existants utilisent encore les anciens noms d'onglets
  // (suivi, demandes, rdv, notes, coups-pouce, dons, logement, infos, rgpd, histo)
  const LEGACY_TAB_MAP: Record<string, { tab: string; anchor: string }> = {
    suivi: { tab: "accompagnement", anchor: "suivi" },
    demandes: { tab: "accompagnement", anchor: "demandes" },
    rdv: { tab: "accompagnement", anchor: "rdv" },
    notes: { tab: "accompagnement", anchor: "notes" },
    "coups-pouce": { tab: "aides", anchor: "coups-pouce" },
    presto: { tab: "aides", anchor: "presto" },
    dons: { tab: "aides", anchor: "dons" },
    logement: { tab: "aides", anchor: "logement" },
    infos: { tab: "profil", anchor: "infos" },
    rgpd: { tab: "profil", anchor: "rgpd" },
    histo: { tab: "profil", anchor: "histo" },
    parcours: { tab: "parcours", anchor: "" },
  };
  const legacySetTab = (t: string) => {
    const m = LEGACY_TAB_MAP[t];
    if (m) jumpTo(m.tab, m.anchor || undefined);
    else setActiveTab(t);
  };


  // Raccourcis clavier : n=venue, d=demande, r=RDV, t=note, c=coup de pouce
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const map: Record<string, { tab: string; anchor?: string; kind?: UsagerActionKind }> = {
        n: { tab: "accompagnement", anchor: "suivi", kind: "suivi" },
        d: { tab: "accompagnement", anchor: "demandes", kind: "demande" },
        r: { tab: "accompagnement", anchor: "rdv", kind: "rdv" },
        t: { tab: "accompagnement", anchor: "notes" },
        c: { tab: "aides", anchor: "coups-pouce" },
      };
      const m = map[e.key.toLowerCase()];
      if (!m) return;
      e.preventDefault();
      jumpTo(m.tab, m.anchor);
      if (m.kind) setTimeout(() => dispatchUsagerAction(m.kind!), 120);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  const refresh = async () => {
    setLoading(true);
    const [u, d, a, r, n, c, l, sv, dn, lg, cp, pr] = await Promise.all([
      supabase.from("usagers").select("*").eq("id", id).single(),
      supabase.from("demandes").select("*").eq("usager_id", id).order("created_at", { ascending: false }),
      supabase.from("accompagnements").select("*").eq("usager_id", id).order("date_action", { ascending: false }),
      supabase.from("rendez_vous").select("*").eq("usager_id", id).order("date_debut", { ascending: false }),
      supabase.from("notes").select("*").eq("usager_id", id).order("created_at", { ascending: false }),
      supabase.from("consentements").select("*").eq("usager_id", id).order("date_consentement", { ascending: false }),
      supabase.from("audit_logs").select("*").eq("table_name", "usagers").eq("record_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("suivis").select("*, suivis_besoins(besoin_id, besoins(id, libelle, code))").eq("usager_id", id).order("date_visite", { ascending: false }),
      supabase
        .from("dons_distributions")
        .select("*, dons_articles(nom, unite)")
        .eq("usager_id", id)
        .order("date_distribution", { ascending: false }),
      supabase
        .from("logement_dossiers")
        .select("*, logement_programmes(type, nom)")
        .eq("usager_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("coups_pouce")
        .select("*")
        .eq("usager_id", id),
      supabase
        .from("presto_requests")
        .select("id, statut, type_pret, date_demande")
        .eq("usager_id", id)
        .order("date_demande", { ascending: false }),
    ]);
    setUsager(u.data);
    setDemandes(d.data ?? []);
    setAccomp(a.data ?? []);
    setRdvs(r.data ?? []);
    setNotes(n.data ?? []);
    setConsents(c.data ?? []);
    setAudit(l.data ?? []);
    setSuivis(sv.data ?? []);
    setDons(dn.data ?? []);
    setLogementDossiers(lg.data ?? []);
    setCoupsPouce(cp.data ?? []);
    setPrestoRequests(pr.data ?? []);

    // Charge les profils des agents impliqués
    const ids = new Set<string>();
    (sv.data ?? []).forEach((x: any) => x.auteur_id && ids.add(x.auteur_id));
    (n.data ?? []).forEach((x: any) => x.auteur_id && ids.add(x.auteur_id));
    (a.data ?? []).forEach((x: any) => x.agent_id && ids.add(x.agent_id));
    (r.data ?? []).forEach((x: any) => x.agent_id && ids.add(x.agent_id));
    (dn.data ?? []).forEach((x: any) => x.agent_id && ids.add(x.agent_id));
    (d.data ?? []).forEach((x: any) => {
      if (x.cree_par) ids.add(x.cree_par);
      if (x.agent_referent_id) ids.add(x.agent_referent_id);
    });
    (lg.data ?? []).forEach((x: any) => x.cree_par && ids.add(x.cree_par));
    (cp.data ?? []).forEach((x: any) => x.cree_par && ids.add(x.cree_par));
    if (ids.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, prenom, nom, email")
        .in("id", Array.from(ids));
      const m: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (m[p.id] = p));
      setProfilesMap(m);
    } else {
      setProfilesMap({});
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const agentName = (uid?: string | null) => {
    if (!uid) return null;
    const p = profilesMap[uid];
    if (!p) return null;
    return [p.prenom, p.nom].filter(Boolean).join(" ") || p.email || null;
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Chargement…</div>;
  }
  if (!usager) {
    return <div className="p-12 text-center text-muted-foreground">Fiche introuvable.</div>;
  }

  const toggleUrgence = async (next: boolean, motif?: string | null) => {
    const payload = next
      ? { urgence: true, urgence_motif: motif ?? null, urgence_signalee_le: new Date().toISOString() }
      : { urgence: false, urgence_motif: null };
    const { error } = await supabase.from("usagers").update(payload).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Situation d'urgence signalée" : "Situation d'urgence levée");
      refresh();
    }
  };

  return (
    <div>
      <UsagerHero
        usager={usager}
        suivis={suivis}
        demandes={demandes}
        rdvs={rdvs}
        coupsPouce={coupsPouce}
        notes={notes}
        onToggleUrgence={toggleUrgence}
        setActiveTab={legacySetTab}
        isScdOnly={isScdOnly}
      />


      <div className="p-6 grid gap-6 min-[1440px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="parcours">Parcours</TabsTrigger>
            <TabsTrigger value="accompagnement">
              Accompagnement
              <Badge variant="secondary" className="ml-2">
                {suivis.length + demandes.length + rdvs.length + notes.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="aides">
              Aides
              <Badge variant="secondary" className="ml-2">
                {coupsPouce.length + logementDossiers.length + dons.length + prestoRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="profil">Profil &amp; docs</TabsTrigger>
          </TabsList>



          {/* PARCOURS — timeline unifiée + panneau contextuel */}
          <TabsContent value="parcours" className="mt-4">
            <UsagerTimeline
              suivis={suivis}
              demandes={demandes}
              rdvs={rdvs}
              coupsPouce={coupsPouce}
              notes={notes}
              dons={dons}
              logementDossiers={logementDossiers}
              agentName={agentName}
              setActiveTab={legacySetTab}
            />
          </TabsContent>


          {/* INFOS */}
          <TabsContent value="profil" id="infos" className="mt-4 grid gap-4 md:grid-cols-2 scroll-mt-20">
            <h3 className="md:col-span-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informations</h3>
            <InfoCard title="État civil">
              <KV k="Prénom" v={usager.prenom} />
              <KV k="Nom" v={usager.nom} />
              <KV k="Date de naissance" v={formatDate(usager.date_naissance)} />
              <KV k="Genre" v={GENRES[usager.genre]} />
            </InfoCard>
            <InfoCard title="Contact">
              <KV k="E-mail" v={usager.email ?? "—"} />
              <KV k="Téléphone" v={usager.telephone ?? "—"} />
            </InfoCard>
            <InfoCard title="Situation">
              <KV k="Public" v={TYPES_PUBLIC[usager.type_public] ?? "—"} />
              <KV k="Composante" v={usager.composante ?? "—"} />
              <KV k="Établissement" v={usager.etablissement ?? "—"} />
              <KV k="Niveau" v={usager.niveau_etudes ?? "—"} />
              <KV k="N° étudiant" v={usager.numero_etudiant ?? "—"} />
            </InfoCard>
            <NotesInternesCard
              usagerId={id}
              initial={usager.notes_internes ?? ""}
              notes={notes}
              agentName={agentName}
              onSaved={refresh}
            />

            {usager.type_public === "etudiant" && (
              <InfoCard title="Mailing list étudiante">
                {!usager.mailing_optin ? (
                  <p className="text-sm text-muted-foreground italic">
                    L'étudiant n'a pas demandé à recevoir la mailing list.
                  </p>
                ) : usager.mailing_inscrit ? (
                  <div className="space-y-2">
                    <Badge className="bg-success/10 text-success border-success/30 border" variant="outline">
                      Inscrit le {formatDate(usager.mailing_inscrit_le)}
                    </Badge>
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await supabase
                            .from("usagers")
                            .update({ mailing_inscrit: false, mailing_inscrit_le: null })
                            .eq("id", id);
                          toast.success("Inscription retirée");
                          refresh();
                        }}
                      >
                        Retirer l'inscription
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-warning/40 bg-warning/10">
                      À inscrire à la mailing list
                    </Badge>
                    <div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await supabase
                            .from("usagers")
                            .update({
                              mailing_inscrit: true,
                              mailing_inscrit_le: new Date().toISOString(),
                            })
                            .eq("id", id);
                          toast.success("Étudiant marqué comme inscrit");
                          refresh();
                        }}
                      >
                        Marquer comme inscrit
                      </Button>
                    </div>
                  </div>
                )}
              </InfoCard>
            )}
          </TabsContent>

          {/* SUIVI — journal motif/solution */}
          <TabsContent value="accompagnement" id="suivi" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Suivi</h3>
            <SuiviReorienterTrigger
              usager={usager}
              structureId={usager.structure_creatrice_id}
              onCreated={refresh}
            />
            <NewSuiviForm
              usagerId={id}
              usager={usager}
              structureId={usager.structure_creatrice_id}
              onCreated={refresh}
            />
            {suivis.length === 0 ? (
              <Empty icon={MessageSquare} text="Aucun suivi enregistré." />
            ) : (
              <div className="space-y-2">
                {suivis.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="text-xs text-muted-foreground">
                        Visite du {formatDate(s.date_visite)} · saisi le {formatDateTime(s.created_at)}
                        {agentName(s.auteur_id) ? ` · par ${agentName(s.auteur_id)}` : ""}
                        {s.created_at !== s.updated_at
                          ? ` · modifié le ${formatDateTime(s.updated_at)}`
                          : ""}
                      </div>
                      {s.suivis_besoins?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.suivis_besoins.map((sb: any) => (
                            <Badge key={sb.besoin_id} variant="secondary" className="text-[11px]">
                              {sb.besoins?.libelle ?? sb.besoins?.code}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                          <span className="text-xs text-amber-800 dark:text-amber-200 flex-1">
                            Aucun besoin renseigné pour cette venue.
                          </span>
                          <AddBesoinsToSuiviDialog suiviId={s.id} onSaved={refresh} />
                        </div>
                      )}
                      {s.motif_venue && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Motif de venue
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{s.motif_venue}</p>
                        </div>
                      )}
                      {s.solution_apportee && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Solution apportée
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {s.solution_apportee}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DEMANDES */}
          <TabsContent value="accompagnement" id="demandes" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sollicitations / urgences</h3>
            <div className="flex justify-end">
              <NewDemandeDialog
                usagerId={id}
                structureId={usager.structure_creatrice_id}
                typePublic={usager.type_public}
                onCreated={refresh}
              />
            </div>
            {demandes.length === 0 ? (
              <Empty icon={ListTodo} text="Aucune demande enregistrée." />
            ) : (
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 data-table">
                    <tr>
                      <th className="text-left px-4 py-3">Titre</th>
                      <th className="text-left px-4 py-3">Typologie</th>
                      <th className="text-left px-4 py-3">Priorité</th>
                      <th className="text-left px-4 py-3">Statut</th>
                      <th className="text-left px-4 py-3">Créée le · par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {demandes.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 font-medium">{d.titre}</td>
                        <td className="px-4 py-3">{TYPOLOGIES[d.typologie]}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={d.priorite} label={PRIORITES[d.priorite]} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={d.statut} label={STATUTS_DEMANDE[d.statut]} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDateTime(d.created_at)}
                          {agentName(d.cree_par) && <div>par {agentName(d.cree_par)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </TabsContent>

          {/* RDV */}
          <TabsContent value="accompagnement" id="rdv" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rendez-vous</h3>
            <div className="flex justify-end">
              <NewRdvDialog usagerId={id} structureId={usager.structure_creatrice_id} onCreated={refresh} />
            </div>
            {rdvs.length === 0 ? (
              <Empty icon={CalendarPlus} text="Aucun rendez-vous." />
            ) : (
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 data-table">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Objet</th>
                      <th className="text-left px-4 py-3">Modalité</th>
                      <th className="text-left px-4 py-3">Statut</th>
                      <th className="text-left px-4 py-3">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rdvs.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">{formatDateTime(r.date_debut)}</td>
                        <td className="px-4 py-3 font-medium">{r.objet}</td>
                        <td className="px-4 py-3">{MODALITES_RDV[r.modalite]}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={r.statut} label={STATUTS_RDV[r.statut]} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {agentName(r.agent_id) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </TabsContent>

          {/* DONS */}
          <TabsContent value="aides" id="dons" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dons distribués</h3>
            <div className="flex justify-end">
              <NewDonDialog
                usagerId={id}
                structureId={usager.structure_creatrice_id}
                onCreated={refresh}
              />
            </div>
            {dons.length === 0 ? (
              <Empty icon={Package} text="Aucun don distribué à cet usager." />
            ) : (
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 data-table">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Article</th>
                      <th className="text-right px-4 py-3">Quantité</th>
                      <th className="text-left px-4 py-3">Notes</th>
                      <th className="text-left px-4 py-3">Saisi le · par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dons.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(d.date_distribution)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {d.dons_articles?.nom ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(d.quantite)} {d.dons_articles?.unite ?? ""}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.notes ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(d.created_at)}
                          {agentName(d.agent_id) && <div>par {agentName(d.agent_id)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            <div className="pt-2">
              <DemandesNonSatisfaitesSection
                usagerId={id}
                structureId={usager.structure_creatrice_id}
                territoireId={usager.territoire_id}
              />
            </div>
          </TabsContent>



          {/* LOGEMENT */}
          <TabsContent value="aides" id="logement" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logement</h3>
            <div className="flex justify-end">
              <NewLogementDialog
                usagerId={id}
                structureId={usager.structure_creatrice_id}
                territoireId={usager.territoire_id}
                onCreated={refresh}
              />
            </div>
            {logementDossiers.length === 0 ? (
              <Empty icon={Home} text="Aucun dossier logement pour cet usager." />
            ) : (
              <div className="space-y-3">
                {logementDossiers.map((d) => (
                  <LogementDossierCard key={d.id} dossier={d} onChanged={refresh} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* COUPS DE POUCE */}
          <TabsContent value="aides" id="coups-pouce" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Coups de pouce</h3>
            <CoupsPouceTab usagerId={id} structureId={usager.structure_creatrice_id} />
          </TabsContent>

          {/* PRESTO — prêt d'ordinateurs */}
          <TabsContent value="aides" id="presto" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">PRESTO</h3>
            <PrestoTab usagerId={id} />
          </TabsContent>

          <TabsContent value="accompagnement" id="notes" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
            <NewNoteForm usagerId={id} structureId={usager.structure_creatrice_id} onCreated={refresh} />
            {notes.length === 0 ? (
              <Empty icon={StickyNote} text="Aucune note." />
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <Card key={n.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatDateTime(n.created_at)}
                        {agentName(n.auteur_id) ? ` · par ${agentName(n.auteur_id)}` : ""}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.contenu}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* RGPD */}
          <TabsContent value="profil" id="rgpd" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RGPD</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {usager.consentement_actif ? (
                        <ShieldCheck className="h-5 w-5 text-success" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-warning-foreground" />
                      )}
                      Consentement {usager.consentement_actif ? "actif" : "non recueilli"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dernière mise à jour : {formatDateTime(usager.date_dernier_consentement)}
                    </p>
                  </div>
                  {!usager.consentement_actif && (
                    <Button
                      onClick={async () => {
                        await supabase
                          .from("usagers")
                          .update({
                            consentement_actif: true,
                            date_dernier_consentement: new Date().toISOString(),
                          })
                          .eq("id", id);
                        await supabase.from("consentements").insert({
                          usager_id: id,
                          accepte: true,
                          contenu:
                            "L'usager consent à la collecte et au traitement de ses données personnelles.",
                          recueilli_par: profile?.id,
                        });
                        toast.success("Consentement enregistré");
                        refresh();
                      }}
                    >
                      Enregistrer le consentement
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Droits RGPD</h3>
                <p className="text-xs text-muted-foreground">
                  Droit d'accès (article 15) et droit à l'effacement (article 17).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { exportUsagerDataPDF } = await import("@/lib/rgpd-export");
                        await exportUsagerDataPDF(id);
                        toast.success("Export PDF généré");
                      } catch (e: any) {
                        toast.error(e?.message ?? "Erreur export");
                      }
                    }}
                  >
                    Exporter ses données (PDF)
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("Anonymiser définitivement cet usager ? Action irréversible : identité, contacts et notes seront effacés.")) return;
                      const { error } = await (supabase.rpc as any)("anonymize_usager", { _usager_id: id });
                      if (error) toast.error(error.message);
                      else { toast.success("Usager anonymisé"); refresh(); }
                    }}
                  >
                    Anonymiser cet usager
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Portail usager</h3>
                <p className="text-xs text-muted-foreground">
                  Génère un lien personnel à partager avec l'usager (par e-mail, SMS de votre messagerie, papier).
                  Il pourra consulter ses RDV, ateliers et coups de pouce, sans avoir à créer de compte.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const tokenStr =
                      typeof crypto !== "undefined" && "randomUUID" in crypto
                        ? (crypto as any).randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10)
                        : Math.random().toString(36).slice(2) + Date.now().toString(36);
                    const { error } = await supabase
                      .from("usager_portail_tokens" as never)
                      .insert({ usager_id: id, token: tokenStr, created_by: profile?.id } as never);
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
                    const url = `${window.location.origin}/portail/${tokenStr}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Lien copié dans le presse-papier (valide 30 jours)");
                    } catch {
                      toast.success("Lien généré : " + url);
                    }
                  }}
                >
                  Générer un lien portail (30 jours)
                </Button>
              </CardContent>
            </Card>

            <h3 className="text-sm font-semibold mt-6">Historique des consentements</h3>
            {consents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun consentement archivé.</p>
            ) : (
              consents.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium">
                          {c.accepte ? "Accepté" : "Refusé"} — version {c.version}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(c.date_consentement)} · conservation {c.duree_conservation_mois} mois
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{c.contenu}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* HISTORIQUE */}
          <TabsContent value="profil" id="histo" className="mt-4 space-y-3 scroll-mt-20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Historique</h3>
            {audit.length === 0 ? (
              <Empty icon={History} text="Aucun événement journalisé." />
            ) : (
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 data-table">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {audit.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(l.created_at)}
                        </td>
                        <td className="px-4 py-3">{l.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </div>
        <UsagerSidePanel
          demandes={demandes}
          rdvs={rdvs}
          suivis={suivis}
          notes={notes}
          coupsPouce={coupsPouce}
          logementDossiers={logementDossiers}
          agentName={agentName}
          onJump={(tab, anchor) => jumpTo(tab, anchor)}
        />
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          {title}
        </h3>
        <dl className="space-y-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

function NotesInternesCard({
  usagerId,
  initial,
  notes,
  agentName,
  onSaved,
}: {
  usagerId: string;
  initial: string;
  notes: any[];
  agentName: (uid?: string | null) => string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("usagers")
      .update({ notes_internes: value || null })
      .eq("id", usagerId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note interne enregistrée");
    setEditing(false);
    onSaved();
  };
  const recent = (notes ?? []).slice(0, 5);
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Notes internes
          </h3>
          {!editing && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>
              {initial ? "Modifier" : "Ajouter"}
            </Button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setValue(initial);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">
            {initial || <span className="text-muted-foreground italic">Aucune note interne synthétique.</span>}
          </p>
        )}
        {recent.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Dernières notes ({notes.length})
            </div>
            {recent.map((n) => (
              <div key={n.id} className="text-xs">
                <div className="text-muted-foreground">
                  {formatDateTime(n.created_at)}
                  {agentName(n.auteur_id) ? ` · ${agentName(n.auteur_id)}` : ""}
                </div>
                <p className="whitespace-pre-wrap text-foreground">{n.contenu}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-right">{v || "—"}</dd>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}

// ===== Dialogs / forms =====

function NewDemandeDialog({
  usagerId,
  structureId,
  typePublic,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  typePublic: "etudiant" | "pij" | "paej";
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => onUsagerAction("demande", () => setOpen(true)), []);
  const [besoinsCatalog, setBesoinsCatalog] = useState<
    {
      id: string;
      code: string;
      libelle: string;
      pour_etudiant: boolean;
      pour_pij: boolean;
      pour_paej: boolean;
    }[]
  >([]);
  const [selectedBesoins, setSelectedBesoins] = useState<Record<string, boolean>>({});
  const [precisionAutre, setPrecisionAutre] = useState("");
  const [corr, setCorr] = useState<Correspondance[]>([]);
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponses>>({});
  const [pendingPrompt, setPendingPrompt] = useState<{ id: string; libelle: string } | null>(null);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    typologie: "logement",
    priorite: "normale",
    statut: "nouvelle",
    orientation_vers: "",
    type_accompagnement_paej: "individuel",
    nb_parents: "0",
    nb_autres_accompagnants: "0",
  });

  // Charge le catalogue filtré sur le type de public courant
  useEffect(() => {
    if (!open) return;
    (async () => {
      const col =
        typePublic === "etudiant"
          ? "pour_etudiant"
          : typePublic === "pij"
            ? "pour_pij"
            : "pour_paej";
      const { data } = await supabase
        .from("besoins")
        .select("*")
        .eq("actif", true)
        .eq(col, true)
        .order("ordre");
      setBesoinsCatalog((data as any) ?? []);
      setCorr(await loadCorrespondance());
    })();
  }, [open, typePublic]);

  const toggleBesoin = (id: string, libelle: string) =>
    setSelectedBesoins((s) => {
      const next = { ...s, [id]: !s[id] };
      if (next[id]) {
        const prompts = getPromptsForBesoin(id, corr);
        if (prompts.length > 0) setPendingPrompt({ id, libelle });
      } else {
        setPromptResponses((r) => {
          const n = { ...r };
          delete n[id];
          return n;
        });
      }
      return next;
    });

  const hasAutre = besoinsCatalog.some(
    (b) => selectedBesoins[b.id] && b.code === "etu_autre"
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkedIds = Object.entries(selectedBesoins)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checkedIds.length === 0) {
      toast.error("Sélectionnez au moins un besoin.");
      return;
    }

    const payload: any = {
      titre: form.titre,
      description: form.description,
      typologie: form.typologie,
      priorite: form.priorite,
      statut: form.statut,
      orientation_vers: form.orientation_vers || null,
      usager_id: usagerId,
      structure_id: structureId,
      cree_par: profile?.id,
    };
    if (typePublic === "paej") {
      payload.type_accompagnement_paej = form.type_accompagnement_paej;
      payload.nb_parents = parseInt(form.nb_parents) || 0;
      payload.nb_autres_accompagnants = parseInt(form.nb_autres_accompagnants) || 0;
    }

    const { data: dem, error } = await supabase
      .from("demandes")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }

    // Liens demande ↔ besoins (avec correspondances inter-publics)
    const selections = checkedIds.map((bid) => ({
      besoin_id: bid,
      precision_libre:
        besoinsCatalog.find((b) => b.id === bid)?.code === "etu_autre"
          ? precisionAutre || null
          : null,
      prompt_responses: promptResponses[bid],
    }));
    const { error: linkErr } = await insertBesoinLinks({
      table: "demandes_besoins",
      parentField: "demande_id",
      parentId: dem!.id,
      selections,
      corr,
    });
    if (linkErr) {
      toast.error(linkErr);
      return;
    }

    toast.success("Demande créée");
    setOpen(false);
    setSelectedBesoins({});
    setPrecisionAutre("");
    setForm({
      titre: "",
      description: "",
      typologie: "logement",
      priorite: "normale",
      statut: "nouvelle",
      orientation_vers: "",
      type_accompagnement_paej: "individuel",
      nb_parents: "0",
      nb_autres_accompagnants: "0",
    });
    onCreated();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle demande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nouvelle demande — {TYPES_PUBLIC[typePublic]}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
            />
          </div>

          {/* BESOINS — multi-sélection filtrée par public */}
          <div>
            <Label className="mb-2 block">Besoins exprimés *</Label>
            <div className="rounded-md border border-border bg-muted/20 p-3 grid sm:grid-cols-2 gap-2">
              {besoinsCatalog.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">Chargement…</p>
              )}
              {besoinsCatalog.map((b) => (
                <label
                  key={b.id}
                  className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1"
                >
                  <Checkbox
                    checked={!!selectedBesoins[b.id]}
                    onCheckedChange={() => toggleBesoin(b.id, b.libelle)}
                    className="mt-0.5"
                  />
                  <span>{b.libelle}</span>
                </label>
              ))}
            </div>
            {hasAutre && (
              <Input
                className="mt-2"
                placeholder="Précisez « Autre »…"
                value={precisionAutre}
                onChange={(e) => setPrecisionAutre(e.target.value)}
              />
            )}
          </div>

          {/* CHAMPS PAEJ conditionnels */}
          {typePublic === "paej" && (
            <div className="rounded-md border border-border bg-accent/30 p-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accompagnement PAEJ
              </div>
              <div>
                <Label>Type d'accompagnement</Label>
                <Select
                  value={form.type_accompagnement_paej}
                  onValueChange={(v) =>
                    setForm({ ...form, type_accompagnement_paej: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOMPAGNEMENT_PAEJ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nb parents (père/mère/beau-parent)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.nb_parents}
                    onChange={(e) => setForm({ ...form, nb_parents: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nb autres accompagnants</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.nb_autres_accompagnants}
                    onChange={(e) =>
                      setForm({ ...form, nb_autres_accompagnants: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typologie générale</Label>
              <Select
                value={form.typologie}
                onValueChange={(v) => setForm({ ...form, typologie: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPOLOGIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select
                value={form.priorite}
                onValueChange={(v) => setForm({ ...form, priorite: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Orientation vers</Label>
            <Input
              placeholder="Ex : CROUS, CMP, mission locale…"
              value={form.orientation_vers}
              onChange={(e) => setForm({ ...form, orientation_vers: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {pendingPrompt && (
      <BesoinPromptDialog
        open
        prompts={getPromptsForBesoin(pendingPrompt.id, corr)}
        besoinLibelle={pendingPrompt.libelle}
        initial={promptResponses[pendingPrompt.id]}
        onCancel={() => setPendingPrompt(null)}
        onConfirm={(resp) => {
          setPromptResponses((r) => ({ ...r, [pendingPrompt.id]: resp }));
          setPendingPrompt(null);
        }}
      />
    )}
    </>
  );
}

function NewAccompDialog({
  usagerId,
  structureId,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type_action: "",
    description: "",
    date_action: new Date().toISOString().slice(0, 10),
    duree_minutes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("accompagnements").insert({
      usager_id: usagerId,
      structure_id: structureId,
      agent_id: profile?.id,
      type_action: form.type_action,
      description: form.description,
      date_action: form.date_action,
      duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Action enregistrée");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle action
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel accompagnement</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Type d'action *</Label>
            <Input
              required
              placeholder="Ex : Entretien, appel téléphonique, mail…"
              value={form.type_action}
              onChange={(e) => setForm({ ...form, type_action: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date_action}
                onChange={(e) => setForm({ ...form, date_action: e.target.value })}
              />
            </div>
            <div>
              <Label>Durée (min)</Label>
              <Input
                type="number"
                value={form.duree_minutes}
                onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewRdvDialog({
  usagerId,
  structureId,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => onUsagerAction("rdv", () => setOpen(true)), []);
  const [form, setForm] = useState({
    objet: "",
    date_debut: "",
    duree_minutes: "30",
    modalite: "presentiel",
    lieu: "",
    notes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("rendez_vous").insert({
      usager_id: usagerId,
      structure_id: structureId,
      agent_id: profile?.id,
      objet: form.objet,
      date_debut: new Date(form.date_debut).toISOString(),
      duree_minutes: parseInt(form.duree_minutes),
      modalite: form.modalite as any,
      lieu: form.lieu || null,
      notes: form.notes || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rendez-vous planifié");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouveau RDV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau rendez-vous</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Objet *</Label>
            <Input
              required
              value={form.objet}
              onChange={(e) => setForm({ ...form, objet: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date et heure *</Label>
              <Input
                required
                type="datetime-local"
                value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              />
            </div>
            <div>
              <Label>Durée (min)</Label>
              <Input
                type="number"
                value={form.duree_minutes}
                onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modalité</Label>
              <Select
                value={form.modalite}
                onValueChange={(v) => setForm({ ...form, modalite: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODALITES_RDV).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lieu</Label>
              <Input
                value={form.lieu}
                onChange={(e) => setForm({ ...form, lieu: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Planifier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewNoteForm({
  usagerId,
  structureId,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [contenu, setContenu] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenu.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("notes").insert({
      usager_id: usagerId,
      structure_id: structureId,
      auteur_id: profile?.id,
      contenu,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContenu("");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        placeholder="Ajouter une note interne…"
        rows={2}
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={loading || !contenu.trim()}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

function SuiviReorienterTrigger({ usager, structureId, onCreated }: { usager: any; structureId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Réorienter vers un ou plusieurs services
      </Button>
      <ReorienterDialog
        open={open}
        onOpenChange={setOpen}
        usager={usager}
        structureId={structureId}
        onCreated={onCreated}
      />
    </div>
  );
}

function NewSuiviForm({
  usagerId,
  usager,
  structureId,
  onCreated,
}: {
  usagerId: string;
  usager: any;
  structureId: string;
  onCreated: () => void;
}) {
  const [reorientOpen, setReorientOpen] = useState(false);
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => onUsagerAction("suivi", () => setOpen(true)), []);
  const [form, setForm] = useState({
    date_visite: new Date().toISOString().slice(0, 10),
    motif_venue: "",
    solution_apportee: "",
  });
  const [besoins, setBesoins] = useState<any[]>([]);
  const [selectedBesoins, setSelectedBesoins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [besoinSearch, setBesoinSearch] = useState("");
  const [corr, setCorr] = useState<Correspondance[]>([]);
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponses>>({});
  const [pendingPrompt, setPendingPrompt] = useState<{ id: string; libelle: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: bsns }, { data: openDemandes }] = await Promise.all([
        supabase.from("besoins").select("id, libelle, code, ordre, pour_etudiant, pour_pij, pour_paej").eq("actif", true).order("ordre"),
        supabase
          .from("demandes")
          .select("id, statut, demandes_besoins(besoin_id)")
          .eq("usager_id", usagerId)
          .not("statut", "in", "(close,cloturee,terminee,abandonnee)"),
      ]);
      setBesoins(bsns ?? []);
      const preselected = new Set<string>();
      (openDemandes ?? []).forEach((d: any) => {
        (d.demandes_besoins ?? []).forEach((db: any) => {
          if (db.besoin_id) preselected.add(db.besoin_id);
        });
      });
      setSelectedBesoins(preselected);
      setCorr(await loadCorrespondance());
    })();
  }, [open, usagerId]);

  const toggleBesoin = (id: string, libelle?: string) => {
    setSelectedBesoins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPromptResponses((r) => {
          const n = { ...r };
          delete n[id];
          return n;
        });
      } else {
        next.add(id);
        const prompts = getPromptsForBesoin(id, corr);
        const lib = libelle ?? besoins.find((b) => b.id === id)?.libelle ?? "";
        if (prompts.length > 0) setPendingPrompt({ id, libelle: lib });
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBesoins.size === 0) {
      toast.error("Sélectionnez au moins un besoin (item) abordé pendant la venue.");
      return;
    }
    setLoading(true);
    const { data: created, error } = await supabase
      .from("suivis")
      .insert({
        usager_id: usagerId,
        structure_id: structureId,
        auteur_id: profile?.id,
        date_visite: form.date_visite,
        motif_venue: form.motif_venue || null,
        solution_apportee: form.solution_apportee || null,
      })
      .select("id")
      .single();
    if (error || !created) {
      setLoading(false);
      toast.error(error?.message ?? "Erreur");
      return;
    }
    if (selectedBesoins.size > 0) {
      const selections = Array.from(selectedBesoins).map((bid) => ({
        besoin_id: bid,
        prompt_responses: promptResponses[bid],
      }));
      const { error: e2 } = await insertBesoinLinks({
        table: "suivis_besoins",
        parentField: "suivi_id",
        parentId: created.id,
        selections,
        corr,
      });
      if (e2) {
        setLoading(false);
        toast.error(e2);
        return;
      }
    }
    setLoading(false);
    toast.success("Suivi enregistré");
    setForm({
      date_visite: new Date().toISOString().slice(0, 10),
      motif_venue: "",
      solution_apportee: "",
    });
    setSelectedBesoins(new Set());
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle visite
        </Button>
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="dv">Date de la visite</Label>
              <Input
                id="dv"
                type="date"
                value={form.date_visite}
                onChange={(e) => setForm({ ...form, date_visite: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Items / besoins abordés</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Les items des demandes ouvertes sont pré-cochés. Tapez pour rechercher (ex. « logement »).
            </p>
            {(() => {
              const q = besoinSearch.trim().toLowerCase();
              const selected = besoins.filter((b) => selectedBesoins.has(b.id));
              const matches = q
                ? besoins.filter(
                    (b) =>
                      !selectedBesoins.has(b.id) &&
                      ((b.libelle ?? "").toLowerCase().includes(q) ||
                        (b.code ?? "").toLowerCase().includes(q)),
                  )
                : [];
              const renderBadges = (b: any) => (
                <span className="ml-1 inline-flex gap-0.5 align-middle">
                  {b.pour_etudiant && (
                    <span className="text-[9px] px-1 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">ÉTU</span>
                  )}
                  {b.pour_pij && (
                    <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">PIJ</span>
                  )}
                  {b.pour_paej && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">PAEJ</span>
                  )}
                </span>
              );
              return (
                <div className="space-y-2">
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selected.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => toggleBesoin(b.id)}
                          className="px-2.5 py-1 rounded-md text-xs border bg-primary text-primary-foreground border-primary inline-flex items-center"
                          title="Cliquer pour retirer"
                        >
                          {b.libelle} {renderBadges(b)}
                          <span className="ml-1 opacity-70">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Rechercher un item (ex. logement, bourse…)"
                    value={besoinSearch}
                    onChange={(e) => setBesoinSearch(e.target.value)}
                  />
                  {q && (
                    <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                      {matches.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground italic">
                          Aucun item ne correspond.
                        </div>
                      ) : (
                        matches.slice(0, 20).map((b) => (
                          <button
                            type="button"
                            key={b.id}
                            onClick={() => {
                              toggleBesoin(b.id);
                              setBesoinSearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                          >
                            <span>{b.libelle}</span>
                            {renderBadges(b)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {besoins.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Aucun besoin disponible.</span>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <Label htmlFor="mv">Motif de venue (libre)</Label>
            <Textarea
              id="mv"
              rows={3}
              placeholder="Pourquoi la personne est venue ce jour ?"
              value={form.motif_venue}
              onChange={(e) => setForm({ ...form, motif_venue: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="sa">Solution apportée</Label>
            <Textarea
              id="sa"
              rows={3}
              placeholder="Réponse, orientation, document remis…"
              value={form.solution_apportee}
              onChange={(e) => setForm({ ...form, solution_apportee: e.target.value })}
            />
           </div>
           <div className="flex justify-between gap-2 flex-wrap">
             <Button type="button" variant="outline" size="sm" onClick={() => setReorientOpen(true)}>
               Réorienter vers un service
             </Button>
             <div className="flex gap-2">
               <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                 Annuler
               </Button>
               <Button type="submit" size="sm" disabled={loading}>
                 {loading ? "Enregistrement…" : "Enregistrer"}
               </Button>
             </div>
           </div>
         </form>
       </CardContent>
     </Card>
     <ReorienterDialog
       open={reorientOpen}
       onOpenChange={setReorientOpen}
       usager={usager}
       structureId={structureId}
       dateRdv={form.date_visite}
       onCreated={onCreated}
     />
    {pendingPrompt && (
      <BesoinPromptDialog
        open
        prompts={getPromptsForBesoin(pendingPrompt.id, corr)}
        besoinLibelle={pendingPrompt.libelle}
        initial={promptResponses[pendingPrompt.id]}
        onCancel={() => setPendingPrompt(null)}
        onConfirm={(resp) => {
          setPromptResponses((r) => ({ ...r, [pendingPrompt.id]: resp }));
          setPendingPrompt(null);
        }}
      />
    )}
    </>
  );
}

function NewDonDialog({
  usagerId,
  structureId,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [stockByArticle, setStockByArticle] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    article_id: "",
    quantite: 1,
    date_distribution: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: arts } = await supabase
        .from("dons_articles")
        .select("id, nom, unite, structure_id")
        .eq("structure_id", structureId)
        .eq("actif", true)
        .order("nom");
      setArticles((arts ?? []) as any[]);
      const { data: vue } = await supabase
        .from("vue_dons_stock")
        .select("article_id, stock_total")
        .eq("structure_id", structureId);
      const m: Record<string, number> = {};
      (vue ?? []).forEach((r: any) => (m[r.article_id] = Number(r.stock_total)));
      setStockByArticle(m);
    })();
  }, [open, structureId]);

  const article = articles.find((a) => a.id === form.article_id);
  const stockDispo = form.article_id ? stockByArticle[form.article_id] ?? 0 : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.article_id || !form.quantite)
      return toast.error("Article et quantité requis");
    if (form.quantite > stockDispo)
      return toast.error("Stock insuffisant");
    setLoading(true);
    const { error } = await supabase.from("dons_distributions").insert({
      structure_id: structureId,
      usager_id: usagerId,
      article_id: form.article_id,
      quantite: form.quantite,
      date_distribution: form.date_distribution,
      agent_id: profile?.id ?? null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Don enregistré");
    setOpen(false);
    setForm({
      article_id: "",
      quantite: 1,
      date_distribution: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <HandCoins className="h-4 w-4 mr-1" />
          Distribuer un don
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Distribuer un don</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Article *</Label>
            <Select
              value={form.article_id}
              onValueChange={(v) => setForm({ ...form, article_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un article…" />
              </SelectTrigger>
              <SelectContent>
                {articles.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    Aucun article. Créez-en dans « Stock de dons ».
                  </div>
                )}
                {articles.map((a) => {
                  const s = stockByArticle[a.id] ?? 0;
                  return (
                    <SelectItem key={a.id} value={a.id} disabled={s <= 0}>
                      {a.nom} — stock : {s} {a.unite}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantité ({article?.unite ?? ""}) *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                max={stockDispo || undefined}
                value={form.quantite}
                onChange={(e) =>
                  setForm({ ...form, quantite: Number(e.target.value) })
                }
              />
              {form.article_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Stock disponible : {stockDispo} {article?.unite}
                </p>
              )}
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date_distribution}
                onChange={(e) =>
                  setForm({ ...form, date_distribution: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== LOGEMENT =====

function NewLogementDialog({
  usagerId,
  structureId,
  territoireId,
  onCreated,
}: {
  usagerId: string;
  structureId: string;
  territoireId: string;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [programmeId, setProgrammeId] = useState("");
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  
  const [hebergementType, setHebergementType] = useState("");
  const [hebergementLieu, setHebergementLieu] = useState("");
  const [hebergementCout, setHebergementCout] = useState("");
  const [cijRdv, setCijRdv] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
     if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("logement_programmes")
        .select("*")
        .eq("actif", true)
        .order("nom");
      const list = (data ?? []) as any[];
      setProgrammes(list);
      if (list.length > 0) setProgrammeId(list[0].id);
    })();
  }, [open, territoireId]);

  const selectedProg = programmes.find((p) => p.id === programmeId);
  const isUrgence = selectedProg?.type === "urgence_ytineraire";

  const submit = async () => {
    if (!programmeId) {
      toast.error("Choisir un programme");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("logement_dossiers").insert({
      usager_id: usagerId,
      programme_id: programmeId,
      structure_id: structureId,
      territoire_id: territoireId,
      statut: "ouvert",
      date_debut: dateDebut,
      cij_rdv_le: isUrgence && cijRdv ? new Date(cijRdv).toISOString() : null,
      hebergement_type: !isUrgence ? hebergementType.trim() || null : null,
      hebergement_lieu: !isUrgence ? hebergementLieu.trim() || null : null,
      hebergement_cout: !isUrgence && hebergementCout ? Number(hebergementCout) : null,
      notes: notes.trim() || null,
      cree_par: profile?.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier logement créé");
      setOpen(false);
      setHebergementType("");
      setHebergementLieu("");
      setHebergementCout("");
      setCijRdv("");
      setNotes("");
      
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau dossier logement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau dossier logement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {programmes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun programme actif. Demandez à un administrateur d'en activer un dans{" "}
              <em>Administration → Programmes logement</em>.
            </p>
          ) : (
            <>
              <div>
                <Label>Programme</Label>
                <Select value={programmeId} onValueChange={setProgrammeId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom} ({LOGEMENT_PROGRAMMES[p.type] ?? p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
              </div>
              {isUrgence ? (
                <div>
                  <Label>RDV CIJ programmé</Label>
                  <Input
                    type="datetime-local"
                    value={cijRdv}
                    onChange={(e) => setCijRdv(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Bail signé pour 15 jours renouvelables 1 fois avec Ytinéraire.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type d'hébergement</Label>
                      <Input
                        placeholder="Airbnb, hôtel…"
                        value={hebergementType}
                        onChange={(e) => setHebergementType(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Coût (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={hebergementCout}
                        onChange={(e) => setHebergementCout(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Lieu / adresse</Label>
                    <Input
                      value={hebergementLieu}
                      onChange={(e) => setHebergementLieu(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving || programmes.length === 0}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogementDossierCard({
  dossier,
  onChanged,
}: {
  dossier: any;
  onChanged: () => void;
}) {
  const { profile } = useAuth();
  const [journal, setJournal] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [entree, setEntree] = useState("");
  const [posting, setPosting] = useState(false);

  const loadJournal = async () => {
    const { data } = await supabase
      .from("logement_journal")
      .select("*")
      .eq("dossier_id", dossier.id)
      .order("created_at", { ascending: false });
    setJournal(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((j: any) => j.auteur_id).filter(Boolean)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nom, prenom, email")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = fullName(p) || p.email;
      });
      setAuthors(map);
    }
  };

  useEffect(() => {
    loadJournal();
  }, [dossier.id]);

  const addEntry = async () => {
    if (!entree.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("logement_journal").insert({
      dossier_id: dossier.id,
      contenu: entree.trim(),
      auteur_id: profile?.id,
    });
    setPosting(false);
    if (error) toast.error(error.message);
    else {
      setEntree("");
      loadJournal();
    }
  };

  const updateStatut = async (newStatut: string) => {
    const patch: any = { statut: newStatut };
    if (newStatut === "cloture" || newStatut === "abandonne") {
      patch.date_fin = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("logement_dossiers")
      .update(patch)
      .eq("id", dossier.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Statut mis à jour");
      onChanged();
    }
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              {dossier.logement_programmes?.nom ?? "Programme"}
              <Badge variant="outline" className="text-[10px]">
                {LOGEMENT_PROGRAMMES[dossier.logement_programmes?.type ?? ""] ?? "—"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Du {formatDate(dossier.date_debut)}
              {dossier.date_fin_prevue ? ` au ${formatDate(dossier.date_fin_prevue)}` : ""}
              {dossier.date_fin ? ` · clôturé le ${formatDate(dossier.date_fin)}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dossier.statut} onValueChange={updateStatut}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOGEMENT_STATUTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dossier.statut !== "cloture" && dossier.statut !== "abandonne" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Mettre fin à ce dossier logement ?")) updateStatut("cloture");
                }}
              >
                Mettre fin
              </Button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {dossier.cij_rdv_le && (
            <div>
              <span className="text-muted-foreground">RDV CIJ : </span>
              <span className="font-medium">{formatDateTime(dossier.cij_rdv_le)}</span>
            </div>
          )}
          {dossier.bail_signe_le && (
            <div>
              <span className="text-muted-foreground">Bail signé : </span>
              <span className="font-medium">
                {formatDate(dossier.bail_signe_le)}
                {dossier.bail_renouvele ? " (renouvelé)" : ""}
              </span>
            </div>
          )}
          {dossier.hebergement_lieu && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Lieu : </span>
              <span className="font-medium">
                {dossier.hebergement_type ? `${dossier.hebergement_type} — ` : ""}
                {dossier.hebergement_lieu}
              </span>
            </div>
          )}
          {dossier.hebergement_cout != null && (
            <div>
              <span className="text-muted-foreground">Coût : </span>
              <span className="font-medium">{Number(dossier.hebergement_cout).toFixed(2)} €</span>
            </div>
          )}
        </div>
        {dossier.notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-border pl-3">
            {dossier.notes}
          </p>
        )}

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Journal de suivi
          </h4>
          <div className="flex gap-2 mb-3">
            <Textarea
              placeholder="Ajouter une entrée du jour…"
              value={entree}
              onChange={(e) => setEntree(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button onClick={addEntry} disabled={posting || !entree.trim()}>
              Ajouter
            </Button>
          </div>
          {journal.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune entrée.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {journal.map((j) => (
                <div
                  key={j.id}
                  className="text-sm p-2 rounded-md border border-border bg-muted/30"
                >
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                    <span>{formatDateTime(j.created_at)}</span>
                    <span>·</span>
                    <span className="font-medium">
                      {authors[j.auteur_id] ?? "Auteur inconnu"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{j.contenu}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddBesoinsToSuiviDialog({
  suiviId,
  onSaved,
}: {
  suiviId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [besoins, setBesoins] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [corr, setCorr] = useState<Correspondance[]>([]);
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponses>>({});
  const [pendingPrompt, setPendingPrompt] = useState<{ id: string; libelle: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("besoins")
        .select("id, libelle, code, ordre, pour_etudiant, pour_pij, pour_paej")
        .eq("actif", true)
        .order("ordre");
      setBesoins(data ?? []);
      setCorr(await loadCorrespondance());
    })();
  }, [open]);

  const toggle = (id: string, libelle?: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPromptResponses((r) => {
          const n = { ...r };
          delete n[id];
          return n;
        });
      } else {
        next.add(id);
        const prompts = getPromptsForBesoin(id, corr);
        const lib = libelle ?? besoins.find((b) => b.id === id)?.libelle ?? "";
        if (prompts.length > 0) setPendingPrompt({ id, libelle: lib });
      }
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) {
      toast.error("Sélectionnez au moins un besoin.");
      return;
    }
    setLoading(true);
    const selections = Array.from(selected).map((bid) => ({
      besoin_id: bid,
      prompt_responses: promptResponses[bid],
    }));
    const { error } = await insertBesoinLinks({
      table: "suivis_besoins",
      parentField: "suivi_id",
      parentId: suiviId,
      selections,
      corr,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Besoins ajoutés");
    setSelected(new Set());
    setPromptResponses({});
    setOpen(false);
    onSaved();
  };

  const q = search.trim().toLowerCase();
  const sel = besoins.filter((b) => selected.has(b.id));
  const matches = q
    ? besoins.filter(
        (b) =>
          !selected.has(b.id) &&
          ((b.libelle ?? "").toLowerCase().includes(q) ||
            (b.code ?? "").toLowerCase().includes(q)),
      )
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter les besoins de cette venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {sel.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sel.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => toggle(b.id)}
                    className="px-2.5 py-1 rounded-md text-xs border bg-primary text-primary-foreground border-primary inline-flex items-center"
                  >
                    {b.libelle}
                    <span className="ml-1 opacity-70">×</span>
                  </button>
                ))}
              </div>
            )}
            <Input
              placeholder="Rechercher un item (ex. logement, bourse…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {q && (
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {matches.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic">
                    Aucun item ne correspond.
                  </div>
                ) : (
                  matches.slice(0, 30).map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => {
                        toggle(b.id, b.libelle);
                        setSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    >
                      {b.libelle}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={loading || selected.size === 0}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {pendingPrompt && (
        <BesoinPromptDialog
          open
          prompts={getPromptsForBesoin(pendingPrompt.id, corr)}
          besoinLibelle={pendingPrompt.libelle}
          initial={promptResponses[pendingPrompt.id]}
          onCancel={() => setPendingPrompt(null)}
          onConfirm={(resp) => {
            setPromptResponses((r) => ({ ...r, [pendingPrompt.id]: resp }));
            setPendingPrompt(null);
          }}
        />
      )}
    </>
  );
}
