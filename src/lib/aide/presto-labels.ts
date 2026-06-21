import type { Database } from "@/integrations/supabase/types";

export type PrestoStatut = Database["public"]["Enums"]["presto_statut"];
export type PrestoTypePret = Database["public"]["Enums"]["presto_type_pret"];
export type PrestoRenewalMotif = Database["public"]["Enums"]["presto_renewal_motif"];
export type PrestoRenewalStatut = Database["public"]["Enums"]["presto_renewal_statut"];

export const PRESTO_TYPES: Record<PrestoTypePret, string> = {
  pc: "PC portable",
  chromebook: "Chromebook",
};

export const PRESTO_STATUTS: Record<PrestoStatut, string> = {
  demande_creee: "Demande créée",
  en_attente_preparation: "En attente de préparation",
  ordinateur_pret: "Ordinateur prêt",
  materiel_recupere: "Matériel récupéré",
  en_cours_pret: "En cours de prêt",
  demande_renouvellement: "Demande de renouvellement",
  renouvellement_accepte: "Renouvellement accepté",
  renouvellement_refuse: "Renouvellement refusé",
  retour_effectue: "Retour effectué",
  cloture: "Clôturé",
};

// Tailwind classes for status badges (uses design tokens)
export const PRESTO_STATUT_TONE: Record<PrestoStatut, string> = {
  demande_creee: "bg-muted text-muted-foreground border-border",
  en_attente_preparation: "bg-warning/10 text-warning-foreground border-warning/30",
  ordinateur_pret: "bg-primary/10 text-primary border-primary/30",
  materiel_recupere: "bg-primary/15 text-primary border-primary/40",
  en_cours_pret: "bg-success/10 text-success border-success/30",
  demande_renouvellement: "bg-warning/10 text-warning-foreground border-warning/40",
  renouvellement_accepte: "bg-success/10 text-success border-success/30",
  renouvellement_refuse: "bg-destructive/10 text-destructive border-destructive/30",
  retour_effectue: "bg-muted text-foreground border-border",
  cloture: "bg-muted text-muted-foreground border-border",
};

export const PRESTO_URGENCES: Record<number, { label: string; tone: string }> = {
  1: { label: "Niveau 1 — Normal", tone: "bg-success/10 text-success border-success/30" },
  2: { label: "Niveau 2 — Pressant", tone: "bg-warning/10 text-warning-foreground border-warning/40" },
  3: { label: "Niveau 3 — Urgent", tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

export const PRESTO_MOTIFS: Record<PrestoRenewalMotif, string> = {
  stage: "Stage",
  alternance: "Alternance",
  seconde_session: "Seconde session",
  autre: "Autre",
};

export const PRESTO_RENEWAL_STATUTS: Record<PrestoRenewalStatut, string> = {
  en_attente: "En attente",
  accepte: "Accepté",
  refuse: "Refusé",
};
