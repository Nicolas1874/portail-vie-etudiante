import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";

export const Route = createFileRoute("/aide/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("audit_logs")
      .select("*, profiles!audit_logs_user_id_fkey(nom, prenom, email)")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <div>
      <PageHeader
        title="Journal RGPD"
        description="Traçabilité des accès et modifications sensibles."
      />
      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 data-table">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Table</th>
                <th className="text-left px-4 py-3">Enregistrement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun événement.
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(l.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {l.profiles?.email ?? <span className="text-muted-foreground italic">système</span>}
                    </td>
                    <td className="px-4 py-3 font-medium">{l.action}</td>
                    <td className="px-4 py-3">{l.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {l.record_id?.slice(0, 8)}…
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
