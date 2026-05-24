// Server functions for reading audit logs (super-admin only).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isSuperAdmin } from "./audit.server";

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).default(100),
        action: z.string().max(64).optional(),
        application: z.enum(["AIDE", "HANDICAP", "CVEC"]).optional(),
        actorEmail: z.string().max(255).optional(),
        sinceDays: z.number().int().min(1).max(365).default(30),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    if (!(await isSuperAdmin(context.userId))) {
      throw new Error("Accès réservé aux super-administrateurs.");
    }

    let q = supabaseAdmin
      .from("audit_logs")
      .select(
        "id, actor_id, actor_email, action, target_type, target_id, target_email, application, details, ip_address, user_agent, created_at",
      )
      .gte(
        "created_at",
        new Date(Date.now() - data.sinceDays * 86_400_000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.action) q = q.eq("action", data.action);
    if (data.application) q = q.eq("application", data.application);
    if (data.actorEmail) q = q.ilike("actor_email", `%${data.actorEmail}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error("Lecture des logs impossible.");
    return { logs: rows ?? [] };
  });

export const exportAuditLogsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sinceDays: z.number().int().min(1).max(365).default(90),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    if (!(await isSuperAdmin(context.userId))) {
      throw new Error("Accès réservé aux super-administrateurs.");
    }

    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select(
        "created_at, actor_email, action, application, target_email, target_type, ip_address, details",
      )
      .gte(
        "created_at",
        new Date(Date.now() - data.sinceDays * 86_400_000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) throw new Error("Export impossible.");

    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Date",
      "Auteur",
      "Action",
      "Application",
      "Cible (email)",
      "Cible (type)",
      "IP",
      "Détails",
    ];
    const lines = [
      headers.join(","),
      ...(rows ?? []).map((r) =>
        [
          escape(r.created_at),
          escape(r.actor_email),
          escape(r.action),
          escape(r.application),
          escape(r.target_email),
          escape(r.target_type),
          escape(r.ip_address),
          escape(r.details),
        ].join(","),
      ),
    ];

    return { csv: lines.join("\n"), count: rows?.length ?? 0 };
  });

export const checkSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isSuperAdmin: await isSuperAdmin(context.userId) };
  });
