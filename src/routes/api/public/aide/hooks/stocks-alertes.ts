import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cron quotidien : alertes stocks de dons.
 *   1) Article dont le stock total <= seuil_alerte → notifier les agents de la structure (1x/jour max).
 *   2) Lot dont la date_peremption est dans <= 7 jours → notifier (1x/jour max).
 */
export const Route = createFileRoute("/api/public/hooks/stocks-alertes")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
        const in7days = new Date(now.getTime() + 7 * 24 * 3600_000).toISOString().slice(0, 10);
        const today = now.toISOString().slice(0, 10);

        let stockAlerts = 0;
        let peremptionAlerts = 0;

        // 1) Stock bas
        const { data: articles } = await supabaseAdmin
          .from("dons_articles")
          .select("id, nom, unite, seuil_alerte, structure_id, last_stock_alert_at")
          .eq("actif", true);

        for (const a of articles ?? []) {
          if (!a.seuil_alerte || a.seuil_alerte <= 0) continue;
          if (a.last_stock_alert_at && a.last_stock_alert_at > oneDayAgo) continue;

          const { data: lots } = await supabaseAdmin
            .from("dons_lots")
            .select("quantite_restante")
            .eq("article_id", a.id);

          const total = (lots ?? []).reduce(
            (s, l: any) => s + Number(l.quantite_restante ?? 0),
            0,
          );
          if (total > a.seuil_alerte) continue;

          const { data: agents } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("structure_id", a.structure_id)
            .eq("active", true);

          for (const u of agents ?? []) {
            await supabaseAdmin.from("notifications").insert({
              destinataire_id: u.id,
              titre: `Stock bas : ${a.nom}`,
              message: `Restant : ${total} ${a.unite} (seuil : ${a.seuil_alerte} ${a.unite}).`,
              lien: "/dons",
            });
            stockAlerts++;
          }

          await supabaseAdmin
            .from("dons_articles")
            .update({ last_stock_alert_at: now.toISOString() })
            .eq("id", a.id);
        }

        // 2) Péremption proche
        const { data: lots } = await supabaseAdmin
          .from("dons_lots")
          .select("id, article_id, structure_id, date_peremption, quantite_restante, last_peremption_alert_at, dons_articles(nom, unite)")
          .gt("quantite_restante", 0)
          .not("date_peremption", "is", null)
          .lte("date_peremption", in7days);

        for (const l of lots ?? []) {
          if (l.last_peremption_alert_at && l.last_peremption_alert_at > oneDayAgo) continue;

          const articleNom = (l as any).dons_articles?.nom ?? "Article";
          const unite = (l as any).dons_articles?.unite ?? "";
          const dansJours = Math.max(
            0,
            Math.round(
              (new Date(l.date_peremption!).getTime() - now.getTime()) / 86400_000,
            ),
          );
          const expired = l.date_peremption! < today;

          const { data: agents } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("structure_id", l.structure_id)
            .eq("active", true);

          for (const u of agents ?? []) {
            await supabaseAdmin.from("notifications").insert({
              destinataire_id: u.id,
              titre: expired
                ? `Lot périmé : ${articleNom}`
                : `Péremption proche : ${articleNom}`,
              message: expired
                ? `Lot de ${l.quantite_restante} ${unite} périmé le ${l.date_peremption}.`
                : `Lot de ${l.quantite_restante} ${unite} — péremption dans ${dansJours} j (${l.date_peremption}).`,
              lien: "/dons",
            });
            peremptionAlerts++;
          }

          await supabaseAdmin
            .from("dons_lots")
            .update({ last_peremption_alert_at: now.toISOString() })
            .eq("id", l.id);
        }

        return new Response(
          JSON.stringify({ ok: true, stockAlerts, peremptionAlerts }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
