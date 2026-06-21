import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/aide-supabase/client.server";

/**
 * Cron : envoi de rappels RDV à l'agent référent
 *  - J-2 (entre 46h et 50h avant)
 *  - J-1 (entre 22h et 26h avant)
 *  - Jour J (entre 0h et 4h avant)
 *
 * Idempotent : on ne notifie qu'une fois par horizon (colonnes reminder_*_sent_at).
 */
export const Route = createFileRoute("/api/public/aide/hooks/rdv-rappels")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date();
        const horizons = [
          {
            label: "J-2",
            field: "reminder_48h_sent_at" as const,
            min: new Date(now.getTime() + 46 * 3600_000),
            max: new Date(now.getTime() + 50 * 3600_000),
          },
          {
            label: "J-1",
            field: "reminder_24h_sent_at" as const,
            min: new Date(now.getTime() + 22 * 3600_000),
            max: new Date(now.getTime() + 26 * 3600_000),
          },
          {
            label: "Jour J",
            field: "reminder_jour_sent_at" as const,
            min: now,
            max: new Date(now.getTime() + 4 * 3600_000),
          },
        ];

        let total = 0;
        const details: any[] = [];

        for (const h of horizons) {
          const { data: rdvs, error } = await supabaseAdmin
            .from("rendez_vous")
            .select("*")
            .gte("date_debut", h.min.toISOString())
            .lte("date_debut", h.max.toISOString())
            .in("statut", ["planifie", "confirme"])
            .is(h.field, null);

          if (error) {
            details.push({ horizon: h.label, error: error.message });
            continue;
          }

          for (const r of (rdvs ?? []) as any[]) {
            if (!r.agent_id) continue;

            const { data: usager } = await supabaseAdmin
              .from("usagers")
              .select("prenom, nom")
              .eq("id", r.usager_id)
              .single();

            const usagerName = usager ? `${usager.prenom} ${usager.nom}` : "usager";
            const dt = new Date(r.date_debut);
            const dateStr = dt.toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            await supabaseAdmin.from("notifications").insert({
              destinataire_id: r.agent_id,
              titre: `Rappel RDV (${h.label}) — ${usagerName}`,
              message: `${r.objet} le ${dateStr}${r.lieu ? ` · ${r.lieu}` : ""}`,
              lien: `/rendez-vous`,
            });

            await supabaseAdmin
              .from("rendez_vous")
              .update({ [h.field]: now.toISOString() } as any)
              .eq("id", r.id);

            total++;
          }

          details.push({ horizon: h.label, traités: rdvs?.length ?? 0 });
        }

        return new Response(
          JSON.stringify({ ok: true, notifications_envoyees: total, details }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
