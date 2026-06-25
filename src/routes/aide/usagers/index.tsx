import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getUsagers } from "@/lib/aide/usagers-actions";
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
import { Search, PlusCircle, User, ExternalLink, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/aide/xlsx-export";
import { toast } from "sonner";
import {
  formatDate,
  fullName,
  USAGER_STATUTS,
  USAGER_SEXES,
  USAGER_SITUATION_FAMILIALE,
  USAGER_TYPE_PUBLIC,
} from "@/lib/aide/labels";
import { StatusBadge } from "@/components/aide/StatusBadge";

export const Route = createFileRoute("/aide/usagers/")({
  component: ListUsagers,
});

function ListUsagers() {
  const { profile, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [usagers, setUsagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"actifs" | "archives">("actifs");
  const [filterSexe, setFilterSexe] = useState<string>("all");
  const [filterTypePublic, setFilterTypePublic] = useState<string>("all");

  const refresh = async () => {
    setLoading(true);
    const res = await getUsagers({ search });
    if (res.error) toast.error(res.error);
    else setUsagers((res.data ?? []) as any);
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

  const filteredUsagers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usagers.filter((u) => {
      if (tab === "actifs" && u.archive) return false;
      if (tab === "archives" && !u.archive) return false;
      if (filterSexe !== "all" && u.sexe !== filterSexe) return false;
      if (filterTypePublic !== "all" && u.type_public !== filterTypePublic) return false;
      if (!q) return true;
      const name = fullName(u).toLowerCase();
      return name.includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.tel ?? "").includes(q);
    });
  }, [usagers, search, tab, filterSexe, filterTypePublic]);

  const canSee = isAdmin || hasRole("agent") || hasRole("superviseur");
  if (!canSee) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Accès aux usagers réservé aux agents et administrateurs.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Usagers"
        description="Gestion des fiches usagers, de leurs informations et de leurs demandes."
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher un usager par nom, email, téléphone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterSexe} onValueChange={setFilterSexe}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Sexe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sexes</SelectItem>
                  {Object.entries(USAGER_SEXES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTypePublic} onValueChange={setFilterTypePublic}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Type de public" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les publics</SelectItem>
                  {Object.entries(USAGER_TYPE_PUBLIC).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-aide hover:bg-aide/90 text-white gap-2"
                onClick={() => navigate({ to: "/aide/usagers/nouveau" })}
              >
                <PlusCircle className="w-4 h-4" />
                Nouvel usager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (usagers.length === 0) { toast.error("Aucune ligne à exporter"); return; }
                  const data = usagers.map((u) => ({
                    nom: u.nom,
                    prenom: u.prenom,
                    email: u.email ?? "",
                    tel: u.tel ?? "",
                    sexe: USAGER_SEXES[u.sexe] ?? "",
                    type_public: USAGER_TYPE_PUBLIC[u.type_public] ?? "",
                    situation_familiale: USAGER_SITUATION_FAMILIALE[u.situation_familiale] ?? "",
                    date_naissance: formatDate(u.date_naissance),
                    statut: USAGER_STATUTS[u.archive ? "archive" : "actif"] ?? "",
                    date_creation: formatDate(u.created_at),
                  }));
                  downloadXlsx(`usagers_${new Date().toISOString().slice(0,10)}.xlsx`, data);
                  toast.success(`${data.length} usager(s) exporté(s)`);
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Exporter Excel
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="actifs">Actifs</TabsTrigger>
                <TabsTrigger value="archives">Archivés</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Chargement…</div>
                ) : filteredUsagers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucun usager.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 data-table">
                        <tr>
                          <th className="text-left px-4 py-3">Nom</th>
                          <th className="text-left px-4 py-3">Email</th>
                          <th className="text-left px-4 py-3">Téléphone</th>
                          <th className="text-left px-4 py-3">Public</th>
                          <th className="text-left px-4 py-3">Statut</th>
                          <th className="text-left px-4 py-3">Créé le</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsagers.map((u) => (
                          <tr
                            key={u.id}
                            className="cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() =>
                              navigate({
                                to: "/aide/usagers/$id",
                                params: { id: u.id },
                              })
                            }
                          >
                            <td className="px-4 py-3 font-medium">{fullName(u)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{u.tel ?? "—"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {USAGER_TYPE_PUBLIC[u.type_public] ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge value={u.archive ? "archive" : "actif"} label={USAGER_STATUTS[u.archive ? "archive" : "actif"]} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                to="/aide/usagers/$id"
                                params={{ id: u.id }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center text-primary hover:underline text-sm"
                              >
                                Ouvrir
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Link>
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
