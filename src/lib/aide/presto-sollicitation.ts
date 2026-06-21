import { supabase } from "@/integrations/supabase/client";

export type SollicitationTypologie =
  | "logement"
  | "sante"
  | "social"
  | "financier"
  | "juridique"
  | "emploi_formation"
  | "mobilite"
  | "numerique"
  | "scolarite"
  | "psychologique"
  | "autre";

/**
 * Crée automatiquement une "sollicitation" (ligne demandes + besoin associé)
 * lorsqu'un usager bénéficie d'un service transverse (PRESTO, Coup de pouce, …).
 *
 * Fournir SOIT `besoinId` (utilisation directe), SOIT `besoinCode` (résolution
 * via le référentiel `besoins`).
 *
 * Cette fonction est best-effort : si la création échoue, on remonte l'erreur
 * en toast côté appelant mais on n'interrompt PAS le flux principal.
 */
export async function logSollicitationBesoin(opts: {
  usagerId: string;
  structureId: string | null;
  creePar: string | null;
  besoinId?: string;
  besoinCode?: string;
  typologie: SollicitationTypologie;
  titre: string;
  description?: string | null;
}): Promise<{ error: string | null }> {
  if (!opts.structureId) {
    return { error: "structure_id manquant — sollicitation non créée." };
  }

  let besoinId = opts.besoinId ?? null;
  if (!besoinId) {
    if (!opts.besoinCode) {
      return { error: "besoinId ou besoinCode requis." };
    }
    const { data: besoin, error: bErr } = await supabase
      .from("besoins")
      .select("id")
      .eq("code", opts.besoinCode)
      .maybeSingle();
    if (bErr || !besoin) {
      return {
        error: `Besoin « ${opts.besoinCode} » introuvable dans le référentiel.`,
      };
    }
    besoinId = besoin.id;
  }

  const { data: dem, error } = await supabase
    .from("demandes")
    .insert({
      usager_id: opts.usagerId,
      structure_id: opts.structureId,
      cree_par: opts.creePar,
      titre: opts.titre,
      description: opts.description ?? null,
      typologie: opts.typologie,
      statut: "nouvelle",
      priorite: "normale",
    })
    .select("id")
    .single();
  if (error || !dem) {
    return { error: error?.message ?? "Création sollicitation impossible" };
  }

  const { error: linkErr } = await supabase
    .from("demandes_besoins")
    .insert({ demande_id: dem.id, besoin_id: besoinId });
  if (linkErr) {
    return { error: linkErr.message };
  }

  return { error: null };
}
