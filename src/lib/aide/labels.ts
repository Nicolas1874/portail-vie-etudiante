export const TYPOLOGIES: Record<string, string> = {
  logement: "Logement",
  sante: "Santé",
  social: "Social",
  financier: "Financier",
  juridique: "Juridique",
  emploi_formation: "Emploi / Formation",
  mobilite: "Mobilité",
  numerique: "Numérique",
  scolarite: "Scolarité",
  psychologique: "Psychologique",
  autre: "Autre",
};

export const STATUTS_DEMANDE: Record<string, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  orientee: "Orientée",
  cloturee: "Clôturée",
  abandonnee: "Abandonnée",
};

export const PRIORITES: Record<string, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const SITUATIONS: Record<string, string> = {
  etudiant: "Étudiant",
  lyceen: "Lycéen",
  jeune_actif: "Jeune actif",
  demandeur_emploi: "Demandeur d'emploi",
  neet: "NEET",
  autre: "Autre",
};

export const GENRES: Record<string, string> = {
  f: "Femme",
  h: "Homme",
  non_binaire: "Non binaire",
  autre: "Autre",
  non_precise: "Non précisé",
};

export const TYPES_PUBLIC: Record<string, string> = {
  etudiant: "Étudiant",
  pij: "PIJ — Information jeunesse",
  paej: "PAEJ — Accueil et écoute jeune",
};

export const ACCOMPAGNEMENT_PAEJ: Record<string, string> = {
  individuel: "Individuel",
  parents: "Avec parent(s)",
  entourage_famille: "Entourage familial",
  autre: "Autre",
};

/** Âge en années à une date donnée (par défaut aujourd'hui). */
export function ageEnAnnees(dateNaissance?: string | null, ref: Date = new Date()): number | null {
  if (!dateNaissance) return null;
  const dn = new Date(dateNaissance);
  if (isNaN(dn.getTime())) return null;
  let age = ref.getFullYear() - dn.getFullYear();
  const m = ref.getMonth() - dn.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dn.getDate())) age--;
  return age;
}

/** Tranche d'âge éligible pour le public PIJ (16-30 ans). */
export function eligiblePIJ(dateNaissance?: string | null): boolean {
  const a = ageEnAnnees(dateNaissance);
  return a !== null && a >= 16 && a <= 30;
}

/** Tranche d'âge éligible pour le public PAEJ (12-25 ans, et + tolérés). */
export function eligiblePAEJ(dateNaissance?: string | null): boolean {
  const a = ageEnAnnees(dateNaissance);
  return a !== null && a >= 12 && a <= 25;
}

/** Tranche d'âge à partir d'une date de naissance (pour stats PAEJ). */
export function trancheAge(dateNaissance?: string | null): string {
  if (!dateNaissance) return "inconnu";
  const dn = new Date(dateNaissance);
  if (isNaN(dn.getTime())) return "inconnu";
  const now = new Date();
  let age = now.getFullYear() - dn.getFullYear();
  const m = now.getMonth() - dn.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dn.getDate())) age--;
  if (age < 12) return "moins_12";
  if (age <= 14) return "12_14";
  if (age <= 17) return "15_17";
  if (age <= 25) return "18_25";
  return "plus_25";
}

export const TRANCHES_AGE: Record<string, string> = {
  moins_12: "− 12 ans",
  "12_14": "12–14 ans",
  "15_17": "15–17 ans",
  "18_25": "18–25 ans",
  plus_25: "+ 25 ans",
  inconnu: "Âge inconnu",
};

export const STATUTS_RDV: Record<string, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  realise: "Réalisé",
  annule: "Annulé",
  absent: "Absent",
};

export const MODALITES_RDV: Record<string, string> = {
  presentiel: "Présentiel",
  visio: "Visio",
  telephone: "Téléphone",
};

export const TYPES_STRUCTURE: Record<string, string> = {
  guichet_aide: "Guichet de l'AIDE",
  bij: "BIJ",
  cij: "CIJ",
  caf: "CAF",
  autre: "Autre",
};

export const ROLES: Record<string, string> = {
  admin: "Administrateur",
  superviseur: "Superviseur",
  agent: "Agent",
  prescripteur: "Prescripteur",
  partenaire: "Ytinéraire",
  ccas: "Assistantes Sociales",
  scd_presto: "SCD — PRESTO",
};

export const LOGEMENT_PROGRAMMES: Record<string, string> = {
  urgence_ytineraire: "Parcours d'urgence — Ytinéraire",
  hebergement_court: "Hébergement court (Airbnb / autre)",
};

export const LOGEMENT_STATUTS: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  cloture: "Clôturé",
  abandonne: "Abandonné",
};

export function fullName(p?: { prenom?: string | null; nom?: string | null } | null) {
  if (!p) return "—";
  return [p.prenom, p.nom].filter(Boolean).join(" ") || "—";
}

export function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
