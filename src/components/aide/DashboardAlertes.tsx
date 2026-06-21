import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Seuil {
  cle: string;
  libelle: string;
  valeur: number;
}

type Counts = {
  urgences: number;
  demandes_ouvertes: number;
  venues_sans_besoin: number;
};

/**
 * Carte d'alertes temps réel.
 * - Charge les seuils paramétrables.
 * - Calcule les compteurs courants.
 * - Se met à jour via Supabase realtime (usagers, demandes).
 */
export function DashboardAlertes() {
  const [seuils, setSeuils] = useState<Record<string, Seuil>>({});
  const [counts, setCounts] = useState<Counts>({
    urgences: 0,
    demandes_ouvertes: 0,
    venues_sans_besoin: 0,
  });

  const refresh = async () => {
    const [u, d, vs] = await Promise.all([
      supabase.from("usagers").select("id", { count: "exact", head: true }).eq("archive", false).eq("urgence", true),
      supabase.from("demandes").select("id", { count: "exact", head: true }).neq("statut", "cloturee"),
      supabase.from("vw_suivis_sans_besoin" as never).select("*", { count: "exact", head: true }),
    ]);
    setCounts({
      urgences: u.count ?? 0,
      demandes_ouvertes: d.count ?? 0,
      venues_sans_besoin: vs.count ?? 0,
    });
  };

  useEffect(() => {
    supabase
      .from("parametres_alertes" as never)
      .select("cle, libelle, valeur")
      .then(({ data }) => {
        const map: Record<string, Seuil> = {};
        ((data as Seuil[]) ?? []).forEach((s) => { map[s.cle] = s; });
        setSeuils(map);
      });
    void refresh();

    const ch = supabase
      .channel("dashboard-alertes")
      .on("postgres_changes", { event: "*", schema: "public", table: "usagers" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "demandes" }, () => { void refresh(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "parametres_alertes" }, (payload) => {
        const s = payload.new as Seuil;
        setSeuils((prev) => ({ ...prev, [s.cle]: s }));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const rules = [
    {
      key: "urgences",
      seuilKey: "urgences_max",
      label: "Usagers en urgence",
      current: counts.urgences,
      link: "/usagers",
    },
    {
      key: "demandes",
      seuilKey: "demandes_ouvertes_max",
      label: "Demandes ouvertes",
      current: counts.demandes_ouvertes,
      link: "/usagers",
    },
    {
      key: "venues_incompletes",
      seuilKey: "venues_sans_besoin_max",
      label: "Venues sans besoin identifié",
      current: counts.venues_sans_besoin,
      link: "/exports",
    },
  ];

  const triggered = rules.filter((r) => {
    const seuil = seuils[r.seuilKey]?.valeur ?? Infinity;
    return r.current > seuil;
  });

  if (Object.keys(seuils).length === 0) return null;

  return (
    <Card className={`p-4 ${triggered.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
      <div className="flex items-center gap-2 mb-3">
        {triggered.length > 0 ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
        <h3 className="font-semibold text-sm">
          Alertes temps réel
          {triggered.length > 0 && (
            <span className="ml-2 text-xs text-destructive">({triggered.length} déclenchée(s))</span>
          )}
        </h3>
        <Activity className="h-3 w-3 ml-auto text-muted-foreground animate-pulse" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {rules.map((r) => {
          const seuil = seuils[r.seuilKey]?.valeur ?? 0;
          const isTriggered = r.current > seuil;
          return (
            <Link
              key={r.key}
              to={r.link as never}
              className={`block rounded border p-3 text-sm transition-colors ${
                isTriggered ? "border-destructive/40 bg-background hover:bg-destructive/5" : "border-border bg-background hover:bg-muted"
              }`}
            >
              <div className="text-xs text-muted-foreground">{r.label}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${isTriggered ? "text-destructive" : ""}`}>{r.current}</span>
                <span className="text-xs text-muted-foreground">/ seuil {seuil}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
