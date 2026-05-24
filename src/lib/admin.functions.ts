// Server functions for administrative mutations.
// Every mutation is authenticated (requireSupabaseAuth) AND re-authorized
// server-side via assertAppAdmin — the client-side role check is a UX hint,
// not a security boundary.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeAuditLog, assertAppAdmin, getUserEmail } from "./audit.server";

const APP_ENUM = z.enum(["AIDE", "HANDICAP", "CVEC"]);
const ROLE_ENUM = z.enum(["admin", "partenaire", "direction"]);

// ----- Lister invitations + membres d'un SI -----
export const listAppMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ application: APP_ENUM }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAppAdmin(context.userId, data.application);

    const [{ data: invs }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("invitations")
        .select("id, email, role, status, created_at, expires_at")
        .eq("application", data.application)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_roles")
        .select("id, user_id, role")
        .eq("application", data.application),
    ]);

    let members: Array<{
      id: string;
      user_id: string;
      role: string;
      email: string | null;
      full_name: string | null;
    }> = [];

    if (roles && roles.length > 0) {
      const ids = [...new Set(roles.map((r) => r.user_id))];
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      members = roles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: map.get(r.user_id)?.email ?? null,
        full_name: map.get(r.user_id)?.full_name ?? null,
      }));
    }

    return {
      invitations: invs ?? [],
      members,
    };
  });

// ----- Créer une invitation -----
export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        application: APP_ENUM,
        email: z.string().trim().toLowerCase().email().max(255),
        role: ROLE_ENUM,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAppAdmin(context.userId, data.application);

    const { data: inserted, error } = await supabaseAdmin
      .from("invitations")
      .insert({
        email: data.email,
        application: data.application,
        role: data.role,
        invited_by: context.userId,
      })
      .select("id")
      .single();

    if (error) throw new Error("Création de l'invitation impossible.");

    await writeAuditLog({
      actor_id: context.userId,
      actor_email: context.claims.email ?? null,
      action: "invitation.created",
      target_type: "invitation",
      target_id: inserted.id,
      target_email: data.email,
      application: data.application,
      details: { role: data.role },
    });

    return { id: inserted.id };
  });

// ----- Révoquer une invitation -----
export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Charger l'invitation pour vérifier l'application
    const { data: inv, error: loadErr } = await supabaseAdmin
      .from("invitations")
      .select("id, email, application, role")
      .eq("id", data.invitationId)
      .single();
    if (loadErr || !inv) throw new Error("Invitation introuvable.");

    await assertAppAdmin(context.userId, inv.application);

    const { error } = await supabaseAdmin
      .from("invitations")
      .delete()
      .eq("id", data.invitationId);
    if (error) throw new Error("Suppression impossible.");

    await writeAuditLog({
      actor_id: context.userId,
      actor_email: context.claims.email ?? null,
      action: "invitation.revoked",
      target_type: "invitation",
      target_id: inv.id,
      target_email: inv.email,
      application: inv.application,
      details: { role: inv.role },
    });

    return { ok: true };
  });

// ----- Retirer un rôle (révoquer accès utilisateur) -----
export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ roleId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow, error: loadErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, application, role")
      .eq("id", data.roleId)
      .single();
    if (loadErr || !roleRow) throw new Error("Rôle introuvable.");

    await assertAppAdmin(context.userId, roleRow.application);

    // Protection : un admin ne peut pas se retirer son propre rôle admin
    // (empêche un super-admin de bloquer toute administration par erreur).
    if (
      roleRow.user_id === context.userId &&
      roleRow.role === "admin"
    ) {
      throw new Error(
        "Vous ne pouvez pas retirer votre propre rôle d'administrateur.",
      );
    }

    const targetEmail = await getUserEmail(roleRow.user_id);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("id", data.roleId);
    if (error) throw new Error("Suppression impossible.");

    await writeAuditLog({
      actor_id: context.userId,
      actor_email: context.claims.email ?? null,
      action: "role.revoked",
      target_type: "user",
      target_id: roleRow.user_id,
      target_email: targetEmail ?? undefined,
      application: roleRow.application,
      details: { role: roleRow.role },
    });

    return { ok: true };
  });
