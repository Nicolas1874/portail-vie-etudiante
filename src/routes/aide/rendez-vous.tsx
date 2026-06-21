import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/aide/StatusBadge";
import { MODALITES_RDV, STATUTS_RDV, formatDateTime, fullName } from "@/lib/aide/labels";

export const Route = createFileRoute("/aide/rendez-vous")({
  component: RdvList,
});

function RdvList() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rendez_vous")
        .select("*, usagers(id, nom, prenom)")
        .gte("date_debut", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("date_debut", { ascending: true });
      setRows(data ?? []);
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Rendez-vous" description="Tous les rendez-vous à venir et récents." />
      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 data-table">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Usager</th>
                <th className="text-left px-4 py-3">Objet</th>
                <th className="text-left px-4 py-3">Modalité</th>
                <th className="text-left px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun rendez-vous.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.date_debut)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/usagers/$id"
                        params={{ id: r.usager_id }}
                        className="text-primary hover:underline font-medium"
                      >
                        {fullName(r.usagers)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.objet}</td>
                    <td className="px-4 py-3">{MODALITES_RDV[r.modalite]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={r.statut} label={STATUTS_RDV[r.statut]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
