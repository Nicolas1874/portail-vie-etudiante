/**
 * Vue 360° — Timeline unifiée + panneau contextuel.
 * Agrège chronologiquement venues, demandes, RDV, coups de pouce, notes, dons, dossiers logement.
 * Présentation uniquement — n'écrit rien, ne mute aucune donnée.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  ListTodo,
  CalendarPlus,
  HandCoins,
  StickyNote,
  Package,
  Home,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { formatDate, formatDateTime, STATUTS_DEMANDE, STATUTS_RDV } from "@/lib/aide/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ease, duration, staggerParent, staggerChild } from "@/lib/aide/motion";
import { dispatchUsagerAction } from "@/lib/aide/usager-shortcuts";

type EventKind = "suivi" | "demande" | "rdv" | "coup-pouce" | "note" | "don" | "logement";

interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string; // ISO
  title: string;
  subtitle?: string;
  raw: any;
}

interface Props {
  suivis: any[];
  demandes: any[];
  rdvs: any[];
  coupsPouce: any[];
  notes: any[];
  dons: any[];
  logementDossiers: any[];
  agentName: (uid?: string | null) => string | null;
  setActiveTab: (t: string) => void;
}

const KIND_META: Record<
  EventKind,
  { label: string; icon: any; color: string; bg: string; tab: string }
> = {
  suivi: { label: "Venue", icon: MessageSquare, color: "text-primary", bg: "bg-primary/10 border-primary/30", tab: "suivi" },
  demande: { label: "Demande", icon: ListTodo, color: "text-warning", bg: "bg-warning/10 border-warning/30", tab: "demandes" },
  rdv: { label: "RDV", icon: CalendarPlus, color: "text-info", bg: "bg-info/10 border-info/30", tab: "rdv" },
  "coup-pouce": { label: "Coup de pouce", icon: HandCoins, color: "text-success", bg: "bg-success/10 border-success/30", tab: "coups-pouce" },
  note: { label: "Note", icon: StickyNote, color: "text-muted-foreground", bg: "bg-surface-2 border-border", tab: "notes" },
  don: { label: "Don distribué", icon: Package, color: "text-accent-foreground", bg: "bg-accent/40 border-accent", tab: "dons" },
  logement: { label: "Dossier logement", icon: Home, color: "text-primary", bg: "bg-primary/10 border-primary/30", tab: "logement" },
};

function buildEvents(p: Omit<Props, "agentName" | "setActiveTab">): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  p.suivis.forEach((s) =>
    events.push({
      id: `suivi-${s.id}`,
      kind: "suivi",
      date: s.date_visite ?? s.created_at,
      title: s.motif_venue?.slice(0, 80) || "Venue enregistrée",
      subtitle: s.suivis_besoins?.length
        ? s.suivis_besoins.map((sb: any) => sb.besoins?.libelle ?? sb.besoins?.code).filter(Boolean).join(" · ")
        : undefined,
      raw: s,
    }),
  );
  p.demandes.forEach((d) =>
    events.push({
      id: `demande-${d.id}`,
      kind: "demande",
      date: d.created_at,
      title: d.titre || d.type || "Demande",
      subtitle: STATUTS_DEMANDE[d.statut] ?? d.statut,
      raw: d,
    }),
  );
  p.rdvs.forEach((r) =>
    events.push({
      id: `rdv-${r.id}`,
      kind: "rdv",
      date: r.date_debut,
      title: r.objet || "Rendez-vous",
      subtitle: STATUTS_RDV[r.statut] ?? r.statut,
      raw: r,
    }),
  );
  p.coupsPouce.forEach((c) =>
    events.push({
      id: `cp-${c.id}`,
      kind: "coup-pouce",
      date: c.created_at,
      title: c.dispositif || "Coup de pouce",
      subtitle: c.statut,
      raw: c,
    }),
  );
  p.notes.forEach((n) =>
    events.push({
      id: `note-${n.id}`,
      kind: "note",
      date: n.created_at,
      title: (n.contenu ?? "").slice(0, 80) || "Note",
      raw: n,
    }),
  );
  p.dons.forEach((d) =>
    events.push({
      id: `don-${d.id}`,
      kind: "don",
      date: d.date_distribution ?? d.created_at,
      title: d.dons_articles?.nom ? `${d.quantite ?? ""} ${d.dons_articles.unite ?? ""} · ${d.dons_articles.nom}`.trim() : "Don distribué",
      raw: d,
    }),
  );
  p.logementDossiers.forEach((l) =>
    events.push({
      id: `log-${l.id}`,
      kind: "logement",
      date: l.created_at,
      title: l.logement_programmes?.nom || "Dossier logement",
      subtitle: l.statut,
      raw: l,
    }),
  );
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

function groupByPeriod(events: TimelineEvent[]) {
  const groups: { label: string; items: TimelineEvent[] }[] = [];
  const fmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const last7 = today - 7 * 86_400_000;
  const last30 = today - 30 * 86_400_000;

  const buckets: Record<string, TimelineEvent[]> = {};
  const order: string[] = [];
  const push = (label: string, ev: TimelineEvent) => {
    if (!buckets[label]) {
      buckets[label] = [];
      order.push(label);
    }
    buckets[label].push(ev);
  };
  for (const ev of events) {
    const t = new Date(ev.date).getTime();
    if (t >= today) push("Aujourd'hui", ev);
    else if (t >= last7) push("7 derniers jours", ev);
    else if (t >= last30) push("30 derniers jours", ev);
    else push(fmt.format(new Date(ev.date)), ev);
  }
  for (const k of order) groups.push({ label: k, items: buckets[k] });
  return groups;
}

type RangeKey = "3m" | "12m" | "all";
const RANGE_LABEL: Record<RangeKey, string> = { "3m": "3 mois", "12m": "12 mois", all: "Tout" };
const GROUP_CAP = 10;

export function UsagerTimeline(props: Props) {
  const { agentName, setActiveTab } = props;
  const events = useMemo(() => buildEvents(props), [props.suivis, props.demandes, props.rdvs, props.coupsPouce, props.notes, props.dons, props.logementDossiers]);
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [range, setRange] = useState<RangeKey>("3m");
  const [compact, setCompact] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const rangeCutoff = range === "all" ? 0 : Date.now() - (range === "3m" ? 90 : 365) * 86_400_000;

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.kind !== filter) return false;
    if (rangeCutoff && new Date(e.date).getTime() < rangeCutoff) return false;
    return true;
  });
  const grouped = useMemo(() => groupByPeriod(filtered), [filtered]);
  const selected = events.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const counts: Record<EventKind | "all", number> = {
    all: events.length,
    suivi: 0, demande: 0, rdv: 0, "coup-pouce": 0, note: 0, don: 0, logement: 0,
  };
  events.forEach((e) => (counts[e.kind] += 1));

  const isOpen = (label: string, idx: number) =>
    collapsed[label] !== undefined ? !collapsed[label] : idx < 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* TIMELINE */}
      <div>
        {/* Filtres + actions rapides */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Tout" count={counts.all} />
          {(Object.keys(KIND_META) as EventKind[]).map((k) =>
            counts[k] > 0 ? (
              <FilterChip
                key={k}
                active={filter === k}
                onClick={() => setFilter(k)}
                label={KIND_META[k].label}
                count={counts[k]}
                icon={KIND_META[k].icon}
              />
            ) : null,
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setActiveTab("suivi"); setTimeout(() => dispatchUsagerAction("suivi"), 50); }}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Venue
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setActiveTab("rdv"); setTimeout(() => dispatchUsagerAction("rdv"), 50); }}>
              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> RDV
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setActiveTab("demandes"); setTimeout(() => dispatchUsagerAction("demande"), 50); }}>
              <ListTodo className="h-3.5 w-3.5 mr-1.5" /> Demande
            </Button>
          </div>
        </div>

        {/* Période + densité */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Période</span>
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-7 px-2.5 rounded-full border text-[11px] font-medium transition-all ${
                range === r
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface-1 border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">Affichage</span>
            <button
              onClick={() => setCompact(true)}
              className={`h-7 px-2.5 rounded-full border font-medium transition-all ${
                compact ? "bg-foreground text-background border-foreground" : "bg-surface-1 border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setCompact(false)}
              className={`h-7 px-2.5 rounded-full border font-medium transition-all ${
                !compact ? "bg-foreground text-background border-foreground" : "bg-surface-1 border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Détaillé
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface-2/40 p-12 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucun évènement à afficher pour ce filtre.</p>
          </div>
        ) : (
          <div className="relative pl-7">
            {/* fil vertical */}
            <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent" />
            {grouped.map((g, gi) => {
              const open = isOpen(g.label, gi);
              const groupExpanded = expandedGroups[g.label];
              const items = groupExpanded ? g.items : g.items.slice(0, GROUP_CAP);
              const hidden = g.items.length - items.length;
              return (
                <div key={g.label} className="mb-5 last:mb-0">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [g.label]: open }))}
                    className="sticky top-0 z-10 -ml-7 pl-7 pr-2 py-1.5 bg-background/85 backdrop-blur-sm mb-2 w-[calc(100%+1.75rem)] flex items-center gap-1.5 text-left rounded hover:bg-muted/40"
                  >
                    {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                      {g.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono tabular-nums">· {g.items.length}</span>
                  </button>
                  {open && (
                    <motion.div variants={staggerParent(0.02)} initial="initial" animate="animate" className={compact ? "space-y-1" : "space-y-2"}>
                      {items.map((ev) => {
                        const M = KIND_META[ev.kind];
                        const Icon = M.icon;
                        const isSel = selected?.id === ev.id;
                        if (compact) {
                          return (
                            <motion.button
                              key={ev.id}
                              variants={staggerChild}
                              onClick={() => setSelectedId(ev.id)}
                              className={`relative w-full text-left group rounded-lg border px-3 py-1.5 transition-all flex items-center gap-2.5 ${
                                isSel
                                  ? "border-primary/40 bg-primary/[0.04]"
                                  : "border-transparent hover:bg-surface-2/60 hover:border-border/40"
                              }`}
                            >
                              <span
                                className={`absolute -left-7 top-1/2 -translate-y-1/2 h-[14px] w-[14px] rounded-full border-2 flex items-center justify-center ${M.bg} ${
                                  isSel ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""
                                }`}
                              >
                                <Icon className={`h-2 w-2 ${M.color}`} />
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono tabular-nums w-16 shrink-0">
                                {formatDate(ev.date)}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider font-semibold w-20 shrink-0 ${M.color}`}>
                                {M.label}
                              </span>
                              <span className="text-xs truncate flex-1">{ev.title}</span>
                            </motion.button>
                          );
                        }
                        return (
                          <motion.button
                            key={ev.id}
                            variants={staggerChild}
                            onClick={() => setSelectedId(ev.id)}
                            className={`relative w-full text-left group rounded-xl border px-3.5 py-3 transition-all ${
                              isSel
                                ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                                : "border-border/60 bg-surface-1 hover:bg-surface-2/60 hover:border-border"
                            }`}
                          >
                            <span
                              className={`absolute -left-7 top-3.5 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center ${M.bg} ${
                                isSel ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""
                              }`}
                            >
                              <Icon className={`h-2.5 w-2.5 ${M.color}`} />
                            </span>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] uppercase tracking-wider font-semibold ${M.color}`}>
                                {M.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                                {formatDate(ev.date)}
                              </span>
                              {ev.raw.auteur_id && agentName(ev.raw.auteur_id) && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  · {agentName(ev.raw.auteur_id)}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium leading-snug line-clamp-2">{ev.title}</div>
                            {ev.subtitle && (
                              <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{ev.subtitle}</div>
                            )}
                          </motion.button>
                        );
                      })}
                      {hidden > 0 && (
                        <button
                          onClick={() => setExpandedGroups((e) => ({ ...e, [g.label]: true }))}
                          className="ml-1 text-[11px] text-primary hover:underline"
                        >
                          Voir {hidden} de plus
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PANNEAU CONTEXTUEL */}
      <aside className="lg:sticky lg:top-4 self-start">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: duration.base, ease: ease.outQuart }}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm"
            >
              <div className={`px-5 py-4 border-b border-border/60 ${KIND_META[selected.kind].bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const Icon = KIND_META[selected.kind].icon;
                    return <Icon className={`h-4 w-4 ${KIND_META[selected.kind].color}`} />;
                  })()}
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${KIND_META[selected.kind].color}`}>
                    {KIND_META[selected.kind].label}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                    {formatDateTime(selected.date)}
                  </span>
                </div>
                <h3 className="font-display font-semibold leading-tight">{selected.title}</h3>
                {selected.subtitle && (
                  <p className="mt-1 text-xs text-muted-foreground">{selected.subtitle}</p>
                )}
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <DetailBlock event={selected} agentName={agentName} />
                <div className="pt-2 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-between -mx-1"
                    onClick={() => setActiveTab(KIND_META[selected.kind].tab)}
                  >
                    <span>Ouvrir dans l'onglet {KIND_META[selected.kind].label.toLowerCase()}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-surface-2/40 p-8 text-center text-sm text-muted-foreground">
              Sélectionne un évènement pour voir son détail ici.
            </div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: any;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-surface-1 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      <span className={`font-mono tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>{count}</span>
    </button>
  );
}

function DetailBlock({ event, agentName }: { event: TimelineEvent; agentName: (uid?: string | null) => string | null }) {
  const r = event.raw;
  const agent = agentName(r.auteur_id ?? r.agent_id ?? r.cree_par);

  if (event.kind === "suivi") {
    return (
      <div className="space-y-2.5">
        {r.suivis_besoins?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {r.suivis_besoins.map((sb: any) => (
              <Badge key={sb.besoin_id} variant="secondary" className="text-[11px]">
                {sb.besoins?.libelle ?? sb.besoins?.code}
              </Badge>
            ))}
          </div>
        )}
        {r.motif_venue && <Field label="Motif">{r.motif_venue}</Field>}
        {r.solution_apportee && <Field label="Solution">{r.solution_apportee}</Field>}
        {agent && <Meta label="Saisi par" value={agent} />}
      </div>
    );
  }
  if (event.kind === "demande") {
    return (
      <div className="space-y-2.5">
        {r.description && <Field label="Description">{r.description}</Field>}
        <div className="grid grid-cols-2 gap-2">
          <Meta label="Statut" value={STATUTS_DEMANDE[r.statut] ?? r.statut} />
          {r.priorite && <Meta label="Priorité" value={r.priorite} />}
        </div>
        {agent && <Meta label="Référent" value={agent} />}
      </div>
    );
  }
  if (event.kind === "rdv") {
    return (
      <div className="space-y-2.5">
        {r.notes && <Field label="Notes">{r.notes}</Field>}
        <div className="grid grid-cols-2 gap-2">
          <Meta label="Statut" value={STATUTS_RDV[r.statut] ?? r.statut} />
          {r.modalite && <Meta label="Modalité" value={r.modalite} />}
        </div>
        {agent && <Meta label="Agent" value={agent} />}
      </div>
    );
  }
  if (event.kind === "coup-pouce") {
    return (
      <div className="space-y-2.5">
        {r.commentaire && <Field label="Commentaire">{r.commentaire}</Field>}
        {r.montant != null && <Meta label="Montant" value={`${r.montant} €`} />}
        {agent && <Meta label="Demandé par" value={agent} />}
      </div>
    );
  }
  if (event.kind === "note") {
    return (
      <div className="space-y-2.5">
        {r.contenu && <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.contenu}</p>}
        {agent && <Meta label="Auteur" value={agent} />}
      </div>
    );
  }
  if (event.kind === "don") {
    return (
      <div className="space-y-2.5">
        {r.quantite != null && <Meta label="Quantité" value={`${r.quantite} ${r.dons_articles?.unite ?? ""}`.trim()} />}
        {r.commentaire && <Field label="Commentaire">{r.commentaire}</Field>}
        {agent && <Meta label="Distribué par" value={agent} />}
      </div>
    );
  }
  if (event.kind === "logement") {
    return (
      <div className="space-y-2.5">
        <Meta label="Statut" value={r.statut} />
        {r.logement_programmes?.type && <Meta label="Type" value={r.logement_programmes.type} />}
        {agent && <Meta label="Créé par" value={agent} />}
      </div>
    );
  }
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{label}</div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground truncate">{value}</span>
    </div>
  );
}
