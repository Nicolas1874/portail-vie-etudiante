import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const consumeSsoToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(20).max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const secret = process.env.AIDE_SSO_SECRET;
    if (!secret) throw new Error("SSO indisponible");

    // 1. Vérification signature + claims standard
    const { payload } = await jwtVerify(
      data.token,
      new TextEncoder().encode(secret),
      { issuer: "portail-vie-etudiante", audience: "si-aide" },
    );

    const email = String(payload.email ?? "").toLowerCase();
    const jti = String(payload.jti ?? "");
    const name = String(payload.name ?? email);
    if (!email || !jti) throw new Error("Token invalide");

    // 2. Anti-rejeu (clé primaire = jti, conflit = déjà utilisé)
    const { error: jtiErr } = await supabaseAdmin
      .from("sso_used_tokens")
      .insert({ jti });
    if (jtiErr) throw new Error("Token déjà utilisé");

    // 3. Trouver / créer l'utilisateur
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let user = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            sso_provider: "portail-vie-etudiante",
          },
        });
      if (createErr || !created.user)
        throw new Error("Création utilisateur impossible");
      user = created.user;
    }

    // 4. Magic link -> verifyOtp pour obtenir une session
    const { data: link, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error("Génération session impossible");
    }

    const { data: verified, error: verifyErr } =
      await supabaseAdmin.auth.verifyOtp({
        type: "magiclink",
        token_hash: link.properties.hashed_token,
      });
    if (verifyErr || !verified.session)
      throw new Error("Vérification session échouée");

    return {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    };
  });
