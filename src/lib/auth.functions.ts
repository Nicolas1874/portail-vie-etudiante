import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid().optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("application, role")
      .eq("user_id", context.userId);

    if (error) {
      throw new Error("Chargement des droits impossible.");
    }

    return {
      roles: (data ?? []) as Array<{
        application: "AIDE" | "HANDICAP" | "CVEC";
        role: "admin" | "partenaire" | "direction";
      }>,
    };
  });