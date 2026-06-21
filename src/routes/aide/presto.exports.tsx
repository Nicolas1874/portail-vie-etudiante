import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadXlsx } from "@/lib/xlsx-export";
import { toast } from "sonner";
import { Download } from "lucide-react";

export const Route = createFileRoute("/aide/presto/exports")({
  component: PrestoExports,
});

interface ExportRow {
  id: string;
  date_demande: string;
  date_recup: string | null;
  date_retour_prevue: string | null;
  statut: string;
  type_pret: string;
  usagers: { ville: string | null } | null;
}

type EnrichedRow = ExportRow & { _delaiJours: number | null; _nbRenew: number };

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function monthsBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

function buildSheets(rows: EnrichedRow[]) {
  const parCampus: Record<string, number> = {};
  const delais: Record<string, number[]> = {};
  const renouvellements: Record<string, number> = {};
  rows.forEach((r) => {
    const campus = r.usagers?.ville ?? "Inconnu";
    parCampus[campus] = (parCampus[campus] ?? 0) + 1;
    renouvellements[campus] = (renouvellements[campus] ?? 0) + r._nbRenew;
    if (r._delaiJours != null) {
      (delais[campus] ??= []).push(r._delaiJours);
    }
  });

  const sheet1 = Object.entries(parCampus)
    .sort((a, b) => b[1] - a[1])
    .map(([campus, n]) => ({
      Campus: campus,
      "Nombre de prêts": n,
      "Renouvellements": renouvellements[campus] ?? 0,
    }));

  const sheet2 = Object.entries(delais).map(([campus, ds]) => ({
    Campus: campus,
    "Nombre de mails « prêt »": ds.length,
    "Délai moyen demande → mail (jours)":
      (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1),
  }));

  const detail = rows.map((r) => ({
    "Date demande": r.date_demande?.slice(0, 10) ?? "",
    Campus: r.usagers?.ville ?? "",
    "Type de prêt": r.type_pret,
    Statut: r.statut,
    "Date prise PC": r.date_recup ?? "",
    "Retour prévu": r.date_retour_prevue ?? "",
    "Délai demande → mail (j)": r._delaiJours ?? "",
    "Nb renouvellements": r._nbRenew,
  }));

  return { "Prêts par campus": sheet1, "Délai moyen envoi mail": sheet2, "Détail": detail };
}

function PrestoExports() {
  const today = new Date().toISOString().slice(0, 10);
  const [debut, setDebut] = useState(today.slice(0, 4) + "-01-01");
  const [fin, setFin] = useState(today);
  const [running, setRunning] = useState(false);

  const exporter = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase
        .from("presto_requests")
        .select(
          "id,date_demande,date_recup,date_retour_prevue,statut,type_pret,usagers(ville)",
        )
        .gte("date_demande", debut)
        .lte("date_demande", fin + "T23:59:59")
        .order("date_demande", { ascending: true });
      if (error) throw error;
      const baseRows = (data ?? []) as unknown as ExportRow[];

      const ids = baseRows.map((r) => r.id);
      const mailMap: Record<string, string> = {};
      const renewCount: Record<string, number> = {};
      if (ids.length > 0) {
        const [{ data: logs }, { data: rens }] = await Promise.all([
          supabase
            .from("presto_notifications_log")
            .select("request_id, sent_at, kind")
            .in("request_id", ids)
            .eq("kind", "ordinateur_pret_mail"),
          supabase
            .from("presto_renewals")
            .select("request_id")
            .in("request_id", ids),
        ]);
        (logs ?? []).forEach((l: any) => {
          if (!mailMap[l.request_id]) mailMap[l.request_id] = l.sent_at;
        });
        (rens ?? []).forEach((r: any) => {
          renewCount[r.request_id] = (renewCount[r.request_id] ?? 0) + 1;
        });
      }

      const rows: EnrichedRow[] = baseRows.map((r) => {
        const sent = mailMap[r.id];
        const delai = sent
          ? Math.round(
              ((new Date(sent).getTime() - new Date(r.date_demande).getTime()) / 86400000) * 10,
            ) / 10
          : null;
        return {
          ...r,
          _delaiJours: delai,
          _nbRenew: renewCount[r.id] ?? 0,
        };
      });

      const nbMois = monthsBetween(debut, fin);

      if (nbMois <= 1) {
        downloadXlsx(`presto_${debut}_${fin}`, buildSheets(rows));
      } else {
        const groupes: Record<string, EnrichedRow[]> = {};
        rows.forEach((r) => {
          const k = monthKey(r.date_demande);
          (groupes[k] ??= []).push(r);
        });

        const synthese = Object.entries(groupes)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([mois, rs]) => {
            const delais = rs
              .map((r) => r._delaiJours)
              .filter((d): d is number => d != null);
            const prets = rs.filter((r) => r.date_recup).length;
            const renew = rs.reduce((s, r) => s + r._nbRenew, 0);
            return {
              Mois: mois,
              Demandes: rs.length,
              "Prêts effectifs (date prise PC renseignée)": prets,
              Renouvellements: renew,
              "Délai moyen demande → mail (j)":
                delais.length > 0
                  ? (delais.reduce((a, b) => a + b, 0) / delais.length).toFixed(1)
                  : "",
            };
          });

        const sheets: Record<string, any[]> = { "Synthèse mensuelle": synthese };
        Object.entries(groupes)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([mois, rs]) => {
            sheets[mois] = buildSheets(rs)["Détail"];
          });

        downloadXlsx(`presto_${debut}_${fin}`, sheets);
      }

      toast.success("Export généré");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="PRESTO — Exports Excel"
        description="Statistiques de prêts sur une période donnée. Sur plusieurs mois, l'export est trié par mois."
      />
      <div className="p-6">
        <Card className="max-w-xl">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date début</Label>
                <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date fin</Label>
                <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
              </div>
            </div>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              <li>Campus déduit de la ville renseignée sur la fiche usager.</li>
              <li>Délai « demande → mail prêt » calculé à partir du mail envoyé par le SCD.</li>
              <li>Nombre de renouvellements demandés cumulé.</li>
              <li>
                Si la période couvre plusieurs mois, l'export contient une feuille de synthèse
                mensuelle + une feuille « détail » par mois.
              </li>
            </ul>
            <Button onClick={exporter} disabled={running}>
              <Download className="h-4 w-4 mr-2" />
              {running ? "Génération…" : "Télécharger l'export"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
