import type { AppName } from "./auth-context";

export interface AppConfig {
  key: AppName;
  name: string;
  shortName: string;
  description: string;
  url: string;
  accent: string;
}

// URL du SI AIDE — preview Lovable (à remplacer par l'URL publiée le moment venu).
const SI_AIDE_URL = "https://id-preview--1a3873ce-27e4-44ee-a7ba-0f902c3557c7.lovable.app";

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
