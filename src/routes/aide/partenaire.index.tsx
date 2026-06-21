import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandCoins, Clock, CheckCircle2, XCircle, TrendingUp, Download } from "lucide-react";
import { downloadXlsx } from "@/lib/xlsx-export";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/partenaire/")({
  component: PartenaireDashboard,
});

interface Stat {
  total: number;
  en_attente: number;
  accorde: number;
  refuse: number;
  montant_accorde: number;
  parMois: { mois: string; nb: number }[];
  parDispositif: { libelle: string; nb: number }[];
}

function PartenaireDashboard() {
  const { profile, hasRole, loading } = useAuth();
  const isPartenaire = hasRole("partenaire");
  const [stat, setStat] = useState<Stat | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile?.structure_partenaire_id) return;
    const spId = profile.structure_partenaire_id;
    (async () => {
      // Dispositifs accessibles par ce partenaire
      const { data: liens } = await supabase
        .from("coups_pouce_dispositifs_partenaires" as never)
        .select("dispositif_id")
        .eq("structure_partenaire_id", spId);
      const dispositifIds = ((liens ?? []) as any[]).map((l) => l.dispositif_id);
      if (dispositifIds.length === 0) {
        setStat({
          total: 0, en_attente: 0, accorde: 0, refuse: 0,
          montant_accorde: 0, parMois: [], parDispositif: [],
        });
        return;
      }

      const { data: cps } = await supabase
        .from("coups_pouce")
        .select("id, statut, montant, date_demande, dispositif_id, coups_pouce_dispositifs(libelle)")
        .in("dispositif_id", dispositifIds);
      const rows = (cps ?? []) as any[];

      const byMois = new Map<string, number>();
      const byDisp = new Map<string, number>();
      let accorde = 0, refuse = 0, attente = 0, montant = 0;
      rows.forEach((c) => {
        if (c.statut === "accorde") { accorde++; montant += Number(c.montant ?? 0); }
        else if (c.statut === "refuse") refuse++;
        else if (c.statut === "en_attente") attente++;
        const d = new Date(c.date_demande);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMois.set(m, (byMois.get(m) ?? 0) + 1);
        const lib = c.coups_pouce_dispositifs?.libelle ?? "Inconnu";
        byDisp.set(lib, (byDisp.get(lib) ?? 0) + 1);
      });

      setStat({
        total: rows.length,
        en_attente: attente,
        accorde,
        refuse,
        montant_accorde: montant,
        parMois: Array.from(byMois.entries()).sort().slice(-12).map(([mois, nb]) => ({ mois, nb })),
        parDispositif: Array.from(byDisp.entries()).map(([libelle, nb]) => ({ libelle, nb })).sort((a, b) => b.nb - a.nb),
      });
    })();
  }, [profile?.structure_partenaire_id]);

  const exportData = async () => {
    if (!profile?.structure_partenaire_id) return;
    setBusy(true);
    try {
      const { data: liens } = await supabase
        .from("coups_pouce_dispositifs_partenaires" as never)
        .select("dispositif_id")
        .eq("structure_partenaire_id", profile.structure_partenaire_id);
      const ids = ((liens ?? []) as any[]).map((l) => l.dispositif_id);
      if (ids.length === 0) { toast.info("Aucun dispositif"); return; }
      const { data } = await supabase
        .from("coups_pouce")
        .select("id, date_demande, date_decision, statut, montant, coups_pouce_dispositifs(libelle)")
        .in("dispositif_id", ids);
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        date_demande: r.date_demande,
        date_decision: r.date_decision,
        statut: r.statut,
        montant: r.montant,
        dispositif: r.coups_pouce_dispositifs?.libelle,
      }));
      downloadXlsx(`partenaire_coups_pouce_${new Date().toISOString().slice(0, 10)}`, rows);
      toast.success(`${rows.length} ligne(s) exportée(s)`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-8">Chargement…</div>;
  if (!isPartenaire) return <Navigate to="/" />;

  return (
    <div>
      <PageHeader
        title="Tableau de bord partenaire"
        description="Vue d'ensemble de l'activité sur vos dispositifs."
      />
      <div className="p-6 space-y-6">
        {!stat ? (
          <div>Chargement des statistiques…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Kpi icon={HandCoins} label="Demandes totales" value={stat.total} />
              <Kpi icon={Clock} label="En attente" value={stat.en_attente} tone="warning" />
              <Kpi icon={CheckCircle2} label="Accordées" value={stat.accorde} tone="success" />
              <Kpi icon={XCircle} label="Refusées" value={stat.refuse} tone="destructive" />
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Montant total accordé</h2>
              </div>
              <p className="text-3xl font-bold">{stat.montant_accorde.toLocaleString("fr-FR")} €</p>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-3">Demandes par mois (12 derniers)</h3>
                {stat.parMois.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {stat.parMois.map((m) => (
                      <li key={m.mois} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-muted-foreground">{m.mois}</span>
                        <div className="flex-1 bg-muted rounded h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, (m.nb / Math.max(...stat.parMois.map((x) => x.nb))) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums">{m.nb}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3">Répartition par dispositif</h3>
                {stat.parDispositif.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                ) : (
                  <ul className="space-y-2">
                    {stat.parDispositif.map((d) => (
                      <li key={d.libelle} className="flex items-center justify-between text-sm">
                        <span>{d.libelle}</span>
                        <Badge variant="secondary">{d.nb}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="flex gap-2">
              <Button onClick={exportData} disabled={busy}>
                <Download className="h-4 w-4 mr-2" />
                Exporter en Excel
              </Button>
              <Button variant="outline" asChild>
                <Link to="/partenaire/coups-pouce">Voir le détail des demandes</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const color =
    tone === "success" ? "text-success"
      : tone === "warning" ? "text-warning-foreground"
        : tone === "destructive" ? "text-destructive"
          : "text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </div>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Card>
  );
}
