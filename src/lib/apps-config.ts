import type { AppName } from "./auth-context";

export interface AppConfig {
  key: AppName;
  name: string;
  shortName: string;
  description: string;
  url: string;
  accent: string;
}

// URL du SI AIDE — à mettre à jour avec l'URL Lovable publiée du projet SI AIDE.
// Ex: "https://project--<lovable-id>.lovable.app" ou le domaine custom.
const SI_AIDE_URL = "https://si-aide.lovable.app"; // TODO: remplacer par l'URL réelle après publication

export const APPS: Record<AppName, AppConfig> = {
  AIDE: {
    key: "AIDE",
    name: "Guichet de l'Aide",
    shortName: "Aide",
    description: "Demandes et suivi des aides étudiantes.",
    url: SI_AIDE_URL,
    accent: "var(--accent-aide)",
  },
  HANDICAP: {
    key: "HANDICAP",
    name: "Passerelle Handicap",
    shortName: "Handicap",
    description: "Accompagnement et aménagements handicap.",
    url: "#",
    accent: "var(--accent-handicap)",
  },
  CVEC: {
    key: "CVEC",
    name: "CVEC",
    shortName: "CVEC",
    description: "Contribution à la vie étudiante et de campus.",
    url: "#",
    accent: "var(--accent-cvec)",
  },
};

export const APP_LIST: AppConfig[] = [APPS.AIDE, APPS.HANDICAP, APPS.CVEC];
