/**
 * Composition du mail de réorientation à partir des paramètres admin
 * et des coordonnées des services choisis (un ou plusieurs).
 *
 * Variables supportées dans intro/conclusion/signature :
 *   {prenom}, {nom}, {date_rdv}, {structure}, {email_structure}, {telephone_structure}
 *
 * Le bloc « services » est rendu automatiquement (un par service) entre
 * l'introduction et la conclusion.
 */
export interface ReorientService {
  nom: string;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  horaires?: string | null;
  message_specifique?: string | null;
}

export interface ReorientMailContext {
  usager: { prenom?: string | null; nom?: string | null; email?: string | null };
  dateRdv?: string | null;
  structure?: { nom?: string | null; email?: string | null; telephone?: string | null };
  services: ReorientService[];
  settings: {
    objet_mail: string;
    introduction: string;
    conclusion: string;
    signature: string;
    mentions_legales?: string | null;
  };
}

function formatDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function renderServiceBlock(svc: ReorientService): string {
  return [
    `**${svc.nom}**`,
    svc.message_specifique,
    svc.adresse ? `📍 ${svc.adresse}` : null,
    svc.telephone ? `📞 ${svc.telephone}` : null,
    svc.email ? `✉️ ${svc.email}` : null,
    svc.horaires ? `🕒 ${svc.horaires}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReorientMail(ctx: ReorientMailContext) {
  const vars: Record<string, string> = {
    prenom: ctx.usager.prenom ?? "",
    nom: ctx.usager.nom ?? "",
    date_rdv: formatDate(ctx.dateRdv),
    structure: ctx.structure?.nom ?? "",
    email_structure: ctx.structure?.email ?? "",
    telephone_structure: ctx.structure?.telephone ?? "",
    nombre_services: String(ctx.services.length),
  };

  const objet = fillTemplate(ctx.settings.objet_mail, vars);

  const blocServices = ctx.services.map(renderServiceBlock).join("\n\n");

  const corps = [
    fillTemplate(ctx.settings.introduction, vars),
    "",
    ctx.services.length > 1
      ? "Voici les contacts qui pourront vous accompagner :"
      : "Voici le contact qui pourra vous accompagner :",
    "",
    blocServices,
    "",
    fillTemplate(ctx.settings.conclusion, vars),
    "",
    fillTemplate(ctx.settings.signature, vars),
    ctx.settings.mentions_legales ? `\n---\n${ctx.settings.mentions_legales}` : "",
  ].join("\n");

  return { objet, corps };
}

export function buildMailtoUrl(to: string, objet: string, corps: string, cc?: string) {
  const params = new URLSearchParams({ subject: objet, body: corps });
  if (cc) params.set("cc", cc);
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, "%20")}`;
}
