import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/aide-supabase/client.server";

/**
 * Statistiques publiques agrégées et anonymisées.
 * Aucune donnée personnelle. Lecture seule.
 *
 * GET /api/public/stats[?annee=2025&territoire_id=...]
 */
export const Route = createFileRoute("/api/public/aide/stats")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const annee = url.searchParams.get("annee");
        const territoireId = url.searchParams.get("territoire_id");

        let q = supabaseAdmin
          .from("vw_stats_publiques" as never)
          .select("annee, type_public, territoire_id, nb_usagers");
        if (annee) q = q.eq("annee", Number(annee));
        if (territoireId) q = q.eq("territoire_id", territoireId);

        const { data, error } = await q;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = (data as Array<{ annee: number; type_public: string; territoire_id: string | null; nb_usagers: number }>) ?? [];
        const total = rows.reduce((s, r) => s + (r.nb_usagers ?? 0), 0);
        const par_public: Record<string, number> = {};
        const par_annee: Record<string, number> = {};
        rows.forEach((r) => {
          par_public[r.type_public] = (par_public[r.type_public] ?? 0) + r.nb_usagers;
          par_annee[String(r.annee)] = (par_annee[String(r.annee)] ?? 0) + r.nb_usagers;
        });

        return new Response(
          JSON.stringify(
            {
              generated_at: new Date().toISOString(),
              filters: { annee: annee ? Number(annee) : null, territoire_id: territoireId },
              totaux: { usagers: total },
              par_public,
              par_annee,
              details: rows,
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
