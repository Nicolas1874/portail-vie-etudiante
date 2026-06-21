import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, ShieldAlert, AlertTriangle } from "lucide-react";
import { SITUATIONS, formatDate, fullName, TYPES_PUBLIC } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useTerritoireScope } from "@/lib/territoire-scope";

export const Route = createFileRoute("/_app/usagers/")({
  component: ListUsagers,
});

interface Row {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  ville: string | null;
  situation: string;
  type_public: string;
  consentement_actif: boolean;
  urgence: boolean;
  urgence_motif: string | null;
  created_at: string;
}

function ListUsagers() {
  const { isAdminPur } = useAuth();
  const { selected: territoireScope } = useTerritoireScope();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from("usagers")
      .select("id, nom, prenom, date_naissance, ville, situation, type_public, consentement_actif, urgence, urgence_motif, created_at")
      .eq("archive", false)
      // Urgences en premier, puis plus récents
      .order("urgence", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (territoireScope !== "all") {
      query = query.eq("territoire_id", territoireScope);
    }

    if (q.trim()) {
      query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,ville.ilike.%${q}%,numero_etudiant.ilike.%${q}%`);
    }
    const { data } = await query;
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, territoireScope]);
  

  return (
    <div>
      <PageHeader
        title="Usagers"
        description={
          isAdminPur
            ? "Lecture seule (mode Admin). Endossez un rôle métier pour créer/modifier — Paramètres → Mode test."
            : "Liste des étudiants et jeunes accompagnés sur votre périmètre. Pour créer une fiche, utilisez le bouton du tableau de bord."
        }
      />

      <div className="p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, prénom ou ville…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3">Nom complet</th>
                  <th className="text-left px-4 py-3">Public</th>
                  <th className="text-left px-4 py-3">Date de naissance</th>
                  <th className="text-left px-4 py-3">Situation</th>
                  <th className="text-left px-4 py-3">Consentement</th>
                  <th className="text-left px-4 py-3">Créée le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Chargement…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                      Aucun usager. Créez votre première fiche.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-muted/40 cursor-pointer ${
                        r.urgence ? "bg-destructive/5 hover:bg-destructive/10" : ""
                      }`}
                      title={r.urgence && r.urgence_motif ? `Urgence : ${r.urgence_motif}` : undefined}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/usagers/$id"
                          params={{ id: r.id }}
                          className="font-medium text-foreground hover:text-primary inline-flex items-center gap-2"
                        >
                          {r.urgence && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className={r.urgence ? "text-destructive" : ""}>
                            {fullName(r)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {TYPES_PUBLIC[r.type_public] ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(r.date_naissance)}
                      </td>
                      <td className="px-4 py-3">{SITUATIONS[r.situation] ?? r.situation}</td>
                      <td className="px-4 py-3">
                        {r.consentement_actif ? (
                          <Badge className="bg-success/10 text-success border-success/30 border" variant="outline">
                            Recueilli
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning/40 text-warning-foreground bg-warning/10">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            À recueillir
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
