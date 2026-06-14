import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Webhook appelé par chaque SI (AIDE / HANDICAP / CVEC) quand un admin
// modifie les droits d'un utilisateur. Le portail met à jour son cache local
// user_roles pour afficher / masquer les tuiles correspondantes.
//
// Sécurité : HMAC-SHA256 sur le body brut, signé avec PORTAL_ROLES_SYNC_SECRET
// (le même secret est partagé avec les 3 projets SI). Header `x-portal-signature`.

const PayloadSchema = z.object({
  action: z.enum(["grant", "revoke", "revoke_all"]),
  application: z.enum(["AIDE", "HANDICAP", "CVEC"]),
  email: z.string().email().max(320),
  role: z.enum(["admin", "partenaire", "direction"]).optional(),
});

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-portal-signature",
  };
}

export const Route = createFileRoute("/api/public/roles/sync")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const secret = process.env.PORTAL_ROLES_SYNC_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "Server misconfigured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        }

        const body = await request.text();
        const signature = request.headers.get("x-portal-signature");
        if (!verifySignature(body, signature, secret)) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        }

        let parsed;
        try {
          parsed = PayloadSchema.parse(JSON.parse(body));
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid payload", details: String(e) }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = parsed.email.toLowerCase();

        // Récupère l'utilisateur par email s'il existe déjà
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle();

        try {
          if (parsed.action === "grant") {
            if (!parsed.role) {
              return new Response(JSON.stringify({ error: "role required for grant" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders() },
              });
            }
            if (profile) {
              await supabaseAdmin
                .from("user_roles")
                .upsert(
                  { user_id: profile.id, application: parsed.application, role: parsed.role },
                  { onConflict: "user_id,application,role", ignoreDuplicates: true },
                );
            } else {
              // Utilisateur pas encore inscrit au portail : on stocke une invitation
              // qui sera consommée par le trigger handle_new_user à sa 1re connexion.
              await supabaseAdmin
                .from("invitations")
                .insert({
                  email,
                  application: parsed.application,
                  role: parsed.role,
                  status: "pending",
                });
            }
          } else if (parsed.action === "revoke") {
            if (!parsed.role) {
              return new Response(JSON.stringify({ error: "role required for revoke" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders() },
              });
            }
            if (profile) {
              await supabaseAdmin
                .from("user_roles")
                .delete()
                .eq("user_id", profile.id)
                .eq("application", parsed.application)
                .eq("role", parsed.role);
            }
            // Nettoie aussi d'éventuelles invitations en attente
            await supabaseAdmin
              .from("invitations")
              .delete()
              .ilike("email", email)
              .eq("application", parsed.application)
              .eq("role", parsed.role)
              .eq("status", "pending");
          } else if (parsed.action === "revoke_all") {
            if (profile) {
              await supabaseAdmin
                .from("user_roles")
                .delete()
                .eq("user_id", profile.id)
                .eq("application", parsed.application);
            }
            await supabaseAdmin
              .from("invitations")
              .delete()
              .ilike("email", email)
              .eq("application", parsed.application)
              .eq("status", "pending");
          }

          // Audit
          await supabaseAdmin.from("audit_logs").insert({
            action: `roles.sync.${parsed.action}`,
            application: parsed.application,
            target_email: email,
            target_type: "user",
            details: { role: parsed.role ?? null, source: "si_webhook" },
          });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        } catch (err) {
          console.error("[roles/sync] error", err);
          return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        }
      },
    },
  },
});
