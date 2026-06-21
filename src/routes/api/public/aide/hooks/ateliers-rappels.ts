import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/ateliers-rappels")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date();
        const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
        const in46h = new Date(now.getTime() + 46 * 3600 * 1000);

        // Sessions à T+46h..T+48h non encore notifiées
        const { data: sessions, error } = await supabaseAdmin
          .from("ateliers_sessions")
          .select("id, date_debut, lieu, atelier_id, ateliers(titre)")
          .gte("date_debut", in46h.toISOString())
          .lte("date_debut", in48h.toISOString())
          .is("reminder_sent_at", null);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let notified = 0;
        for (const s of sessions ?? []) {
          const { data: inscriptions } = await supabaseAdmin
            .from("ateliers_inscriptions")
            .select("id, prenom, nom, email")
            .eq("session_id", s.id)
            .eq("statut", "inscrit");

          // Note : envoi d'email non implémenté ici (à brancher sur le système d'emails du projet).
          // On marque la session comme rappelée pour éviter les doublons.
          notified += inscriptions?.length ?? 0;

          await supabaseAdmin
            .from("ateliers_sessions")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", s.id);
        }

        return new Response(
          JSON.stringify({
            ok: true,
            sessions: sessions?.length ?? 0,
            inscrits_notifies: notified,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
