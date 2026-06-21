/**
 * Onglet « Liste de courses » dans la page Dons.
 *
 * Vue consolidée des demandes non satisfaites de la structure courante.
 * - Filtrage par statut, recherche libellé
 * - Regroupement par article (quand rattaché) pour voir le total à approvisionner
 * - Export CSV
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { Download, Check, X, ShoppingBasket, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/aide/labels";

type Row = {
  id: string;
  libelle: string;
  quantite: number;
  article_id: string | null;
  statut: "en_attente" | "satisfait" | "abandonne";
  note: string | null;
  created_at: string;
  date_satisfaction: string | null;
  usager_id: string | null;
  usagers: { id: string; prenom: string | null; nom: string | null } | null;
  dons_articles: { nom: string; unite: string } | null;
};

export function DonsListeDeCoursesTab() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filterStatut, setFilterStatut] = useState<string>("en_attente");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("demandes_non_satisfaites")
      .select(
        "*, usagers(id, prenom, nom), dons_articles(nom, unite)",
      )
      .order("created_at", { ascending: false });
    if (filterStatut !== "all") query = query.eq("statut", filterStatut);
    const { data } = await query;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatut]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.libelle.toLowerCase().includes(needle) ||
        (r.usagers?.prenom ?? "").toLowerCase().includes(needle) ||
        (r.usagers?.nom ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  // Regroupement par article (quand rattaché à un article du catalogue)
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { libelle: string; unite: string; total: number; count: number }
    >();
    filtered
      .filter((r) => r.article_id && r.statut === "en_attente")
      .forEach((r) => {
        const key = r.article_id!;
        const cur = map.get(key) ?? {
          libelle: r.dons_articles?.nom ?? r.libelle,
          unite: r.dons_articles?.unite ?? "",
          total: 0,
          count: 0,
        };
        cur.total += r.quantite;
        cur.count += 1;
        map.set(key, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const setStatut = async (
    id: string,
    statut: "en_attente" | "satisfait" | "abandonne",
  ) => {
    const { error } = await supabase
      .from("demandes_non_satisfaites")
      .update({
        statut,
        date_satisfaction:
          statut === "satisfait" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  const exportCsv = () => {
    const header = [
      "Libellé",
      "Quantité",
      "Article",
      "Statut",
      "Usager",
      "Note",
      "Demandé le",
    ];
    const lines = filtered.map((r) =>
      [
        r.libelle,
        r.quantite,
        r.dons_articles?.nom ?? "",
        r.statut,
        r.usagers ? `${r.usagers.prenom ?? ""} ${r.usagers.nom ?? ""}`.trim() : "",
        r.note ?? "",
        formatDate(r.created_at),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liste-de-courses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {grouped.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ShoppingBasket className="h-4 w-4" />
            À approvisionner (articles du catalogue)
          </div>
          <ul className="text-sm space-y-1">
            {grouped.map((g) => (
              <li key={g.libelle} className="flex justify-between">
                <span className="font-medium">{g.libelle}</span>
                <span className="text-muted-foreground">
                  {g.total} {g.unite} — {g.count} demande(s)
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher libellé ou usager…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="satisfait">Satisfait</SelectItem>
            <SelectItem value="abandonne">Abandonné</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm data-table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3">Libellé</th>
              <th className="text-right px-4 py-3">Qté</th>
              <th className="text-left px-4 py-3">Article</th>
              <th className="text-left px-4 py-3">Usager</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Demandé le</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  Aucune demande.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.libelle}</div>
                    {r.note && (
                      <div className="text-xs text-muted-foreground">{r.note}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{r.quantite}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.dons_articles?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.usagers ? (
                      <Link
                        to="/usagers/$id"
                        params={{ id: r.usagers.id }}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        {r.usagers.prenom} {r.usagers.nom}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.statut === "en_attente" && (
                      <Badge variant="outline">En attente</Badge>
                    )}
                    {r.statut === "satisfait" && (
                      <Badge className="bg-success/10 text-success border-success/30 border">
                        Satisfait
                      </Badge>
                    )}
                    {r.statut === "abandonne" && (
                      <Badge variant="outline" className="opacity-60">
                        Abandonné
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {r.statut === "en_attente" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatut(r.id, "satisfait")}
                          title="Marquer satisfait"
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatut(r.id, "abandonne")}
                          title="Abandonner"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
