export type DispositifType = "bon_finance" | "don_direct" | "pret" | "autre";

export const TYPES_DISPOSITIF: Record<DispositifType, string> = {
  bon_finance: "Bon financier",
  don_direct: "Don direct",
  pret: "Prêt",
  autre: "Autre",
};

export type ChampType = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export interface ChampPerso {
  key: string;
  label: string;
  type: ChampType;
  required?: boolean;
  options?: string[]; // pour select
  placeholder?: string;
  remplissable_par?: "guichetier" | "partenaire" | "les_deux";
}

export const TYPES_CHAMP: Record<ChampType, string> = {
  text: "Texte court",
  textarea: "Texte long",
  number: "Nombre",
  date: "Date",
  select: "Liste déroulante",
  checkbox: "Case à cocher",
};

export interface DispositifPartenairePermission {
  id?: string;
  structure_partenaire_id: string;
  peut_voir: boolean;
  peut_confirmer_passage: boolean;
  peut_remplir_fiche: boolean;
  peut_imprimer: boolean;
  peut_changer_statut: boolean;
}

export interface Ticket {
  id: string;
  coup_pouce_id: string;
  numero: string;
  montant: number | null;
  statut: "emis" | "utilise" | "expire" | "annule";
  date_utilisation: string | null;
  utilise_par_profile_id: string | null;
  utilise_par_structure_partenaire_id: string | null;
  date_expiration: string | null;
  notes: string | null;
}

export const STATUTS_TICKET: Record<string, string> = {
  emis: "Émis",
  utilise: "Utilisé",
  expire: "Expiré",
  annule: "Annulé",
};
