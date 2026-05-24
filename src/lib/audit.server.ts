// Server-only helper for writing audit log entries.
// MUST NOT be imported from client code (extension .server.ts blocks it).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";

export type AuditAction =
  | "login.success"
  | "login.failed"
  | "login.password_invalid"
  | "login.mfa_challenge_sent"
  | "login.mfa_verified"
  | "login.mfa_failed"
  | "logout"
  | "password_reset.requested"
  | "invitation.created"
  | "invitation.revoked"
  | "role.granted"
  | "role.revoked"
  | "profile.updated"
  | "admin.page_viewed";

export interface AuditEntry {
  actor_id?: string | null;
  actor_email?: string | null;
  action: AuditAction;
  target_type?: string;
  target_id?: string;
  target_email?: string;
  application?: "AIDE" | "HANDICAP" | "CVEC";
  details?: Record<string, unknown>;
}

function getClientIp(): string | null {
  try {
    const cf = getRequestHeader("cf-connecting-ip");
    if (cf) return cf;
    const xff = getRequestHeader("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const xr = getRequestHeader("x-real-ip");
    if (xr) return xr;
  } catch {
    // outside request scope
  }
  return null;
}

function getUserAgent(): string | null {
  try {
    return getRequestHeader("user-agent") ?? null;
  } catch {
    return null;
  }
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actor_id ?? null,
      actor_email: entry.actor_email ?? null,
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      target_email: entry.target_email ?? null,
      application: entry.application ?? null,
      details: entry.details ?? {},
      ip_address: getClientIp(),
      user_agent: getUserAgent(),
    });
  } catch (err) {
    // Audit logging must never block the user-facing operation.
    console.error("[audit] failed to write log entry", err);
  }
}

// Best-effort: try to look up an email from a user_id via auth admin API.
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

// Check that the caller is admin for the given application server-side.
export async function assertAppAdmin(
  userId: string,
  application: "AIDE" | "HANDICAP" | "CVEC",
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("application", application)
    .eq("role", "admin")
    .limit(1);
  if (error) throw new Error("Vérification des droits impossible.");
  if (!data || data.length === 0) {
    throw new Error("Accès refusé : vous n'êtes pas administrateur de cette application.");
  }
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("application")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data) return false;
  const apps = new Set(data.map((r) => r.application));
  return apps.has("AIDE") && apps.has("HANDICAP") && apps.has("CVEC");
}
