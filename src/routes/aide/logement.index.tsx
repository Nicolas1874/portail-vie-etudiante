import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Home, Search, ExternalLink, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/aide/xlsx-export";
import { toast } from "sonner";
import {
  formatDate,
  fullName,
  LOGEMENT_PROGRAMMES,
  LOGEMENT_STATUTS,
} from "@/lib/aide/labels";
import { StatusBadge } from "@/components/aide/StatusBadge";

export const Route = createFileRoute("/aide/logement/")({
  component: LogementPage,
});

type DossierRow = {
  id: string;
  usager_id: string;
  programme_id: string;
  statut: string;
  date_debut: string;
  date_fin_prevue: string | null;
  date_fin: string | null;
  cij_rdv_le: string | null;
  bail_signe_le: string | null;
  hebergement_lieu: string | null;
  hebergement_cout: number | null;
  usagers: { id: string; nom: string; prenom: string } | null;
  logement_programmes: { type: string; nom: string; territoire_id: string } | null;
};

function LogementPage() {
  const { profile, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"a_traiter" | "traites">("a_traiter");
  const [filterType, setFilterType] = useState<string>("all");
  const [urgenceOnly, setUrgenceOnly] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [{ data }, { data: prg }] = await Promise.all([
      supabase
        .from("logement_dossiers")
        .select(
          "*, usagers!inner(id, nom, prenom), logement_programmes!inner(type, nom, territoire_id)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("logement_programmes")
        .select("id, nom, type, actif, territoires(nom)")
        .eq("actif", true)
        .order("nom"),
    ]);
    setDossiers((data ?? []) as any);
    setProgrammes(prg ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dossiers.filter((d) => {
      const closed = d.statut === "cloture" || d.statut === "abandonne";
      if (tab === "a_traiter" && closed) return false;
      if (tab === "traites" && !closed) return false;
      if (filterType !== "all" && d.logement_programmes?.type !== filterType) return false;
      if (urgenceOnly && d.logement_programmes?.type !== "urgence_ytineraire") return false;
      if (!q) return true;
      const name = fullName(d.usagers ?? undefined).toLowerCase();
      return name.includes(q) || (d.hebergement_lieu ?? "").toLowerCase().includes(q);
    });
  }, [dossiers, search, tab, filterType, urgenceOnly]);

  const stats = useMemo(() => {
    const actifs = dossiers.filter((d) => d.statut !== "cloture" && d.statut !== "abandonne");
    return {
      total: dossiers.length,
      actifs: actifs.length,
      urgence: actifs.filter((d) => d.logement_programmes?.type === "urgence_ytineraire").length,
      hebergement: actifs.filter((d) => d.logement_programmes?.type === "hebergement_court").length,
    };
  }, [dossiers]);

  const canSee = isAdmin || hasRole("ccas") || !!profile?.structure_id;
  if (!canSee) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Accès au module logement réservé aux agents, CCAS et administrateurs.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Logement"
        description="Suivi des parcours d'urgence et des hébergements courts."
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Dossiers actifs" value={stats.actifs} />
          <StatCard label="Parcours d'urgence" value={stats.urgence} />
          <StatCard label="Hébergements courts" value={stats.hebergement} />
          <StatCard label="Total" value={stats.total} muted />
        </div>

        {programmes.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm mb-3">Programmes disponibles</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {programmes.map((p) => (
                    <Link
                    key={p.id}
                    to="/aide/logement/programmes/$id"
                    params={{ id: p.id }}
                    className="border rounded-md p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="font-medium text-sm">{p.nom}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[10px] mr-1">
                        {LOGEMENT_PROGRAMMES[p.type] ?? p.type}
                      </Badge>
                      {p.territoires?.nom ?? "Tous territoires"}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher un usager, un lieu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="md:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {Object.entries(LOGEMENT_PROGRAMMES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={urgenceOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setUrgenceOnly((v) => !v)}
              >
                Urgence uniquement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (dossiers.length === 0) { toast.error("Aucune ligne à exporter"); return; }
                  const fmt = (d: string | null | undefined) => {
                    if (!d) return "";
                    const dt = new Date(d);
                    return `${String(dt.getDate()).padStart(2,"0")}-${String(dt.getMonth()+1).padStart(2,"0")}-${dt.getFullYear()}`;
                  };
                  const data = dossiers.map((d) => ({
                    usager: fullName(d.usagers ?? undefined),
                    programme: LOGEMENT_PROGRAMMES[d.logement_programmes?.type ?? ""] ?? "",
                    statut: LOGEMENT_STATUTS[d.statut] ?? d.statut,
                    date_debut: fmt(d.date_debut),
                    date_fin_prevue: fmt(d.date_fin_prevue),
                    date_fin: fmt(d.date_fin),
                    rdv_cij: fmt(d.cij_rdv_le),
                    bail_signe: fmt(d.bail_signe_le),
                    lieu: d.hebergement_lieu ?? "",
                    cout: d.hebergement_cout ?? "",
                  }));
                  downloadXlsx(`logement_tous_${new Date().toISOString().slice(0,10)}.xlsx`, data);
                  toast.success(`${data.length} dossier(s) exporté(s)`);
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Exporter Excel
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="a_traiter">À traiter</TabsTrigger>
                <TabsTrigger value="traites">Traités</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Chargement…</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucun dossier logement.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 data-table">
                        <tr>
                          <th className="text-left px-4 py-3">Usager</th>
                          <th className="text-left px-4 py-3">Programme</th>
                          <th className="text-left px-4 py-3">Statut</th>
                          <th className="text-left px-4 py-3">Début</th>
                          <th className="text-left px-4 py-3">Fin prévue</th>
                          <th className="text-left px-4 py-3">Lieu / RDV</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((d) => (
                          <tr
                            key={d.id}
                            className="cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() =>
                              navigate({
                                to: "/aide/logement/dossiers/$id",
                                params: { id: d.id },
                              })
                            }
                          >
                            <td className="px-4 py-3 font-medium">{fullName(d.usagers ?? undefined)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {LOGEMENT_PROGRAMMES[d.logement_programmes?.type ?? ""] ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge value={d.statut} label={LOGEMENT_STATUTS[d.statut]} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(d.date_debut)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(d.date_fin_prevue)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {d.hebergement_lieu ??
                                (d.cij_rdv_le ? `RDV CIJ ${formatDate(d.cij_rdv_le)}` : "—")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-3">
                                <a
                                  href={`/logement/dossiers/${d.id}?print=1`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center text-muted-foreground hover:text-foreground hover:underline text-sm"
                                >
                                  Fiche pro
                                  <Printer className="h-3 w-3 ml-1" />
                                </a>
                                <Link
                                  to="/aide/logement/dossiers/$id"
                                  params={{ id: d.id }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center text-primary hover:underline text-sm"
                                >
                                  Ouvrir
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${muted ? "text-muted-foreground" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}