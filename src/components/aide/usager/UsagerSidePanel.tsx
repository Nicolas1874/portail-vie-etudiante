import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CalendarClock,
  HandCoins,
  Activity,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatDateTime, STATUTS_DEMANDE, TYPOLOGIES } from "@/lib/labels";

type Props = {
  demandes: any[];
  rdvs: any[];
  suivis: any[];
  notes: any[];
  coupsPouce: any[];
  logementDossiers: any[];
  agentName: (uid?: string | null) => string | null;
  onJump: (tab: "accompagnement" | "aides" | "profil" | "parcours", anchor?: string) => void;
};

function PanelCard({
  icon: Icon,
  title,
  count,
  empty,
  children,
  cta,
}: {
  icon: any;
  title: string;
  count?: number;
  empty?: string;
  children?: React.ReactNode;
  cta?: { label: string; onClick: () => void };
}) {
  const isEmpty = !children;
  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {title}
          </h4>
          {typeof count === "number" && count > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
          )}
        </div>
        {isEmpty ? (
          <p className="text-xs text-muted-foreground italic">{empty ?? "—"}</p>
        ) : (
          <div className="space-y-1.5">{children}</div>
        )}
        {cta && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-between text-xs"
            onClick={cta.onClick}
          >
            {cta.label}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function UsagerSidePanel({
  demandes,
  rdvs,
  suivis,
  notes,
  coupsPouce,
  logementDossiers,
  agentName,
  onJump,
}: Props) {
  const now = Date.now();

  // 1. Sollicitations en cours
  const sollicitationsEnCours = demandes.filter(
    (d) => d.statut !== "cloturee" && d.statut !== "abandonnee",
  );

  // 2. Prochaines échéances : RDV à venir
  const echeances = rdvs
    .filter((r) => r.date_debut && new Date(r.date_debut).getTime() >= now)
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

  // 3. Aides actives
  const cpActifs = coupsPouce.filter(
    (c) => c.statut !== "cloture" && c.statut !== "refuse",
  );
  const logementsActifs = logementDossiers.filter(
    (l) => l.statut !== "clos" && l.statut !== "annule",
  );
  const aidesCount = cpActifs.length + logementsActifs.length;

  // 4. Dernière interaction
  type Inter = { date: string; kind: string; who: string | null; label: string };
  const interactions: Inter[] = [];
  suivis.forEach((s) =>
    interactions.push({
      date: s.created_at,
      kind: "Suivi",
      who: agentName(s.auteur_id),
      label: s.motif_venue?.slice(0, 60) ?? "",
    }),
  );
  notes.forEach((n) =>
    interactions.push({
      date: n.created_at,
      kind: "Note",
      who: agentName(n.auteur_id),
      label: (n.contenu ?? "").slice(0, 60),
    }),
  );
  rdvs.forEach((r) =>
    interactions.push({
      date: r.created_at ?? r.date_debut,
      kind: "RDV",
      who: agentName(r.agent_id),
      label: r.objet ?? "",
    }),
  );
  interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastInter = interactions[0];

  return (
    <aside className="space-y-3 min-[1440px]:sticky min-[1440px]:top-4 self-start min-w-0">
      {/* Sollicitations en cours */}
      <PanelCard
        icon={AlertCircle}
        title="Sollicitations en cours"
        count={sollicitationsEnCours.length}
        empty="Aucune sollicitation ouverte."
        cta={
          sollicitationsEnCours.length > 3
            ? { label: `Voir les ${sollicitationsEnCours.length} sollicitations`, onClick: () => onJump("accompagnement", "demandes") }
            : undefined
        }
      >
        {sollicitationsEnCours.length === 0
          ? null
          : sollicitationsEnCours.slice(0, 3).map((d) => (
              <button
                key={d.id}
                onClick={() => onJump("accompagnement", "demandes")}
                className="w-full text-left text-xs rounded-md hover:bg-muted/60 p-1.5 -mx-1.5"
              >
                <div className="font-medium truncate">{d.titre}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] h-4">
                    {TYPOLOGIES[d.typologie] ?? d.typologie}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {STATUTS_DEMANDE[d.statut] ?? d.statut}
                  </span>
                </div>
              </button>
            ))}
      </PanelCard>

      {/* Prochaines échéances */}
      <PanelCard
        icon={CalendarClock}
        title="Prochaines échéances"
        count={echeances.length}
        empty="Aucun RDV ni échéance prévus."
        cta={
          echeances.length > 3
            ? { label: `Voir tous les RDV`, onClick: () => onJump("accompagnement", "rdv") }
            : undefined
        }
      >
        {echeances.length === 0
          ? null
          : echeances.slice(0, 3).map((r) => (
              <button
                key={r.id}
                onClick={() => onJump("accompagnement", "rdv")}
                className="w-full text-left text-xs rounded-md hover:bg-muted/60 p-1.5 -mx-1.5"
              >
                <div className="font-medium truncate">{r.objet ?? "RDV"}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDateTime(r.date_debut)}
                </div>
              </button>
            ))}
      </PanelCard>

      {/* Aides actives */}
      <PanelCard
        icon={HandCoins}
        title="Aides actives"
        count={aidesCount}
        empty="Aucune aide en cours."
      >
        {aidesCount === 0 ? null : (
          <>
            {cpActifs.slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => onJump("aides", "coups-pouce")}
                className="w-full text-left text-xs rounded-md hover:bg-muted/60 p-1.5 -mx-1.5"
              >
                <div className="font-medium truncate">Coup de pouce</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Demandé le {formatDate(c.date_demande)}
                  {c.montant ? ` · ${c.montant} €` : ""}
                </div>
              </button>
            ))}
            {logementsActifs.slice(0, 2).map((l) => (
              <button
                key={l.id}
                onClick={() => onJump("aides", "logement")}
                className="w-full text-left text-xs rounded-md hover:bg-muted/60 p-1.5 -mx-1.5"
              >
                <div className="font-medium truncate">Dossier logement</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {l.logement_programmes?.nom ?? "—"}
                </div>
              </button>
            ))}
          </>
        )}
      </PanelCard>

      {/* Dernière interaction */}
      <PanelCard
        icon={Activity}
        title="Dernière interaction"
        empty="Pas encore d'échange enregistré."
      >
        {!lastInter ? null : (
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4">{lastInter.kind}</Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDateTime(lastInter.date)}
              </span>
            </div>
            {lastInter.who && (
              <div className="text-[11px] mt-1">par {lastInter.who}</div>
            )}
            {lastInter.label && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {lastInter.label}
              </p>
            )}
          </div>
        )}
      </PanelCard>
    </aside>
  );
}
