import { formatDate } from "@/lib/labels";

export function renderDocumentTemplate(
  template: string,
  ctx: {
    usager: any;
    coup_pouce: any;
    dispositif: any;
    auteur: any;
    structure_nom: string;
    partenaire_structure?: { nom?: string; adresse?: string } | null;
    ticket?: any;
    ticket_index?: number;
    ticket_total?: number;
  },
) {
  const data: Record<string, string> = {
    usager_prenom: ctx.usager?.prenom ?? "",
    usager_nom: ctx.usager?.nom ?? "",
    usager_numero: ctx.usager?.numero_etudiant ?? "",
    usager_email: ctx.usager?.email ?? "",
    usager_telephone: ctx.usager?.telephone ?? "",
    usager_etablissement: ctx.usager?.etablissement ?? "",
    guichetier_prenom: ctx.auteur?.prenom ?? "",
    guichetier_nom: ctx.auteur?.nom ?? "",
    guichetier_email: ctx.auteur?.email ?? "",
    guichetier_fonction: ctx.auteur?.fonction ?? "",
    structure: ctx.structure_nom,
    date: formatDate(ctx.coup_pouce?.date_demande),
    montant: ctx.coup_pouce?.montant != null ? String(ctx.coup_pouce.montant) : "",
    notes: ctx.coup_pouce?.notes ?? "",
    dispositif: ctx.dispositif?.libelle ?? "",
    partenaire_structure: ctx.partenaire_structure?.nom ?? "",
    partenaire_adresse: ctx.partenaire_structure?.adresse ?? "",
    ticket_numero: ctx.ticket?.numero ?? "",
    ticket_montant: ctx.ticket?.montant != null ? String(ctx.ticket.montant) : "",
    ticket_index: ctx.ticket_index != null ? String(ctx.ticket_index) : "",
    ticket_total_count: ctx.ticket_total != null ? String(ctx.ticket_total) : "",
    ticket_expiration: ctx.ticket?.date_expiration
      ? formatDate(ctx.ticket.date_expiration)
      : "",
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k) => data[k.toLowerCase()] ?? "");
}

export function openPrintWindow(
  titre: string,
  structureNom: string,
  date: string,
  body: string,
) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (ch) =>
      ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : "&#39;",
    );
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(titre)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 2.5cm; color: #111; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
  .body { white-space: pre-wrap; font-size: 14px; }
  @media print { body { padding: 1.5cm; } }
</style></head><body>
<h1>${escapeHtml(titre)}</h1>
<div class="meta">${escapeHtml(structureNom)} · ${escapeHtml(date)}</div>
<div class="body">${escapeHtml(body)}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),200)};</script>
</body></html>`);
  w.document.close();
}
