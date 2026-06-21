import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, ExternalLink, Users, Printer } from "lucide-react";
import { LOGEMENT_PROGRAMMES, LOGEMENT_STATUTS, formatDate, fullName } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/aide/logement/programmes/$id")({
  component: ProgrammeFiche,
});

function ProgrammeFiche() {
  const { id } = Route.useParams();
  const [prog, setProg] = useState<any>(null);
  const [referents, setReferents] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }, { data: d }] = await Promise.all([
        supabase
          .from("logement_programmes")
          .select("*, territoires(nom)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("logement_programmes_partenaires")
          .select(
            "*, partenaires(prenom, nom, email, telephone, fonction, partenaire_structures(nom, telephone, email))",
          )
          .eq("programme_id", id)
          .order("ordre"),
        supabase
          .from("logement_dossiers")
          .select("*, usagers(id, nom, prenom)")
          .eq("programme_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setProg(p);
      setReferents(r ?? []);
      setDossiers(d ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement…</div>;
  if (!prog) return <div className="p-12 text-center text-muted-foreground">Programme introuvable.</div>;

  const actifs = dossiers.filter((d) => d.statut !== "cloture" && d.statut !== "abandonne");

  return (
    <div>
      <PageHeader
        title={prog.nom}
        description={`${LOGEMENT_PROGRAMMES[prog.type] ?? prog.type}${prog.territoires?.nom ? " · " + prog.territoires.nom : ""}${!prog.actif ? " · Inactif" : ""}`}
        actions={
          <div className="flex gap-2" data-no-print>
            <Button asChild variant="outline" size="sm">
              <Link to="/logement">
                <ArrowLeft className="h-4 w-4 mr-1" /> Logement
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer
            </Button>
          </div>
        }
      />
      <div className="p-6 grid gap-6 lg:grid-cols-3 print-area">
        <div className="lg:col-span-2 space-y-4">
          {prog.description && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="font-semibold mb-2 text-sm">Présentation</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {prog.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" /> Dossiers ({dossiers.length} · {actifs.length} actifs)
                </h3>
              </div>
              {dossiers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-6 text-center">
                  Aucun dossier dans ce programme.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 data-table">
                      <tr>
                        <th className="text-left px-3 py-2">Usager</th>
                        <th className="text-left px-3 py-2">Statut</th>
                        <th className="text-left px-3 py-2">Début</th>
                        <th className="text-left px-3 py-2">Fin prévue</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dossiers.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2 font-medium">
                            {fullName(d.usagers ?? undefined)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge value={d.statut} label={LOGEMENT_STATUTS[d.statut]} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(d.date_debut)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(d.date_fin_prevue)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to="/logement/dossiers/$id"
                              params={{ id: d.id }}
                              className="inline-flex items-center text-primary hover:underline text-sm"
                            >
                              Ouvrir <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Home className="h-4 w-4" /> Référents partenaires
              </h3>
              {referents.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">Aucun référent défini.</p>
              ) : (
                <div className="space-y-2">
                  {referents.map((r) => (
                    <ReferentCard key={r.id} r={r} />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Configurer dans Admin → Programmes Logement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReferentCard({ r }: { r: any }) {
  const p = r.partenaires;
  const s = p?.partenaire_structures;
  return (
    <div className="border rounded-md p-3 bg-muted/20">
      <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
        {r.role_libelle}
      </div>
      {p ? (
        <div className="mt-1">
          <div className="font-medium text-sm">
            {[p.prenom, p.nom].filter(Boolean).join(" ")}
          </div>
          {p.fonction && <div className="text-xs text-muted-foreground">{p.fonction}</div>}
          {s?.nom && <div className="text-xs text-muted-foreground">{s.nom}</div>}
          <div className="text-xs mt-1 space-y-0.5">
            {p.email && <div>📧 {p.email}</div>}
            {p.telephone && <div>📞 {p.telephone}</div>}
          </div>
        </div>
      ) : (
        <div className="text-xs italic text-muted-foreground mt-1">À identifier</div>
      )}
    </div>
  );
}
