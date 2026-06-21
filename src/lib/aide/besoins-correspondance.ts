import { supabase } from "@/integrations/aide-supabase/client";

export type Correspondance = {
  id: string;
  source_besoin_id: string;
  mirror_besoin_id: string;
  mode: "auto" | "yes_no" | "multi_choice";
  prompt_label: string | null;
  option_label: string | null;
  ordre: number;
};

export type Prompt = {
  label: string;
  mode: "yes_no" | "multi_choice";
  source_besoin_id: string;
  options: { mirror_besoin_id: string; label: string }[];
};

/** Réponse à une popup, indexée par prompt_label. */
export type PromptResponses = Record<string, boolean | string[]>;

export async function loadCorrespondance(): Promise<Correspondance[]> {
  const { data, error } = await supabase
    .from("besoins_correspondance")
    .select("*")
    .order("ordre");
  if (error) {
    console.error("loadCorrespondance", error);
    return [];
  }
  return (data ?? []) as Correspondance[];
}

/** Construit la liste de popups à montrer pour un besoin source. */
export function getPromptsForBesoin(
  besoinId: string,
  corr: Correspondance[],
): Prompt[] {
  const rows = corr.filter(
    (c) => c.source_besoin_id === besoinId && c.mode !== "auto",
  );
  const byLabel = new Map<string, Prompt>();
  for (const r of rows) {
    const label = r.prompt_label ?? "";
    if (!byLabel.has(label)) {
      byLabel.set(label, {
        label,
        mode: r.mode as "yes_no" | "multi_choice",
        source_besoin_id: besoinId,
        options: [],
      });
    }
    byLabel.get(label)!.options.push({
      mirror_besoin_id: r.mirror_besoin_id,
      label: r.option_label ?? "",
    });
  }
  return Array.from(byLabel.values());
}

/** Renvoie les ids miroirs à créer en fonction des réponses. */
export function resolveMirrors(
  besoinId: string,
  corr: Correspondance[],
  responses: PromptResponses | undefined,
): string[] {
  const out = new Set<string>();
  // auto
  corr
    .filter((c) => c.source_besoin_id === besoinId && c.mode === "auto")
    .forEach((c) => out.add(c.mirror_besoin_id));
  // yes_no / multi_choice
  const prompts = getPromptsForBesoin(besoinId, corr);
  for (const p of prompts) {
    const r = responses?.[p.label];
    if (p.mode === "yes_no") {
      if (r === true) p.options.forEach((o) => out.add(o.mirror_besoin_id));
    } else if (p.mode === "multi_choice") {
      const arr = Array.isArray(r) ? r : [];
      arr.forEach((id) => out.add(id));
    }
  }
  return Array.from(out);
}

/** Insère les liens (sources puis miroirs) pour `demandes_besoins` ou `suivis_besoins`. */
export async function insertBesoinLinks(opts: {
  table: "demandes_besoins" | "suivis_besoins";
  parentField: "demande_id" | "suivi_id";
  parentId: string;
  selections: { besoin_id: string; precision_libre?: string | null; prompt_responses?: PromptResponses }[];
  corr: Correspondance[];
}): Promise<{ error: string | null }> {
  const { table, parentField, parentId, selections, corr } = opts;
  if (selections.length === 0) return { error: null };

  // 1) insert sources
  const sourceRows = selections.map((s) => ({
    [parentField]: parentId,
    besoin_id: s.besoin_id,
    precision_libre: s.precision_libre ?? null,
    prompt_response: s.prompt_responses ? (s.prompt_responses as any) : null,
  }));
  const { data: inserted, error: e1 } = await (supabase.from(table) as any)
    .insert(sourceRows)
    .select("id, besoin_id");
  if (e1) return { error: e1.message };

  // 2) insert mirrors
  const mirrorRows: any[] = [];
  for (const sel of selections) {
    const sourceRow = (inserted ?? []).find(
      (r: any) => r.besoin_id === sel.besoin_id,
    );
    if (!sourceRow) continue;
    const mirrorIds = resolveMirrors(sel.besoin_id, corr, sel.prompt_responses);
    for (const mid of mirrorIds) {
      // évite doublon si l'utilisateur a aussi coché manuellement le miroir
      if (selections.some((s) => s.besoin_id === mid)) continue;
      mirrorRows.push({
        [parentField]: parentId,
        besoin_id: mid,
        parent_id: sourceRow.id,
      });
    }
  }
  if (mirrorRows.length > 0) {
    const { error: e2 } = await (supabase.from(table) as any).insert(mirrorRows);
    if (e2) return { error: e2.message };
  }
  return { error: null };
}
