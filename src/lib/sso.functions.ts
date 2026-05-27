// Server function to issue a short-lived JWT for SSO into the SI AIDE app.
import { createServerFn } from "@tanstack/react-start";
import { SignJWT } from "jose";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

const ISSUER = "portail-vie-etudiante";
const AUDIENCE = "si-aide";
const TOKEN_TTL_SECONDS = 60;

export const issueAideSsoToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const secret = process.env.AIDE_SSO_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("SSO indisponible : secret manquant ou trop court.");
    }

    const { userId } = context;

    // Vérifie l'accès à l'application AIDE
    const { data: hasAccess, error: accessError } = await supabaseAdmin.rpc(
      "has_app_access",
      { _user_id: userId, _app: "AIDE" },
    );
    if (accessError) throw new Error("Vérification des droits impossible.");
    if (!hasAccess) throw new Error("Vous n'avez pas accès au SI AIDE.");

    // Récupère email + full_name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();
    if (profileError || !profile?.email) {
      throw new Error("Profil introuvable.");
    }

    // Génère le JWT
    const jti = crypto.randomUUID();
    const token = await new SignJWT({
      email: profile.email,
      name: profile.full_name ?? profile.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
      .sign(new TextEncoder().encode(secret));

    // Audit
    try {
      const ip = getRequestIP({ xForwardedFor: true }) ?? null;
      const ua = getRequestHeader("user-agent") ?? null;
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        actor_email: profile.email,
        action: "sso.issue",
        application: "AIDE",
        target_type: "sso_token",
        target_id: jti,
        target_email: profile.email,
        ip_address: ip,
        user_agent: ua,
        details: { aud: AUDIENCE, ttl: TOKEN_TTL_SECONDS },
      });
    } catch (e) {
      console.error("[sso] audit log insert failed", e);
    }

    return { token, expiresIn: TOKEN_TTL_SECONDS };
  });
