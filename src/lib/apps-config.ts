import type { AppName } from "./auth-context";

export interface AppConfig {
  key: AppName;
  name: string;
  shortName: string;
  description: string;
  url: string;
  accent: string;
}

// URLs placeholder — les SI cibles sont en cours de développement.
export const APPS: Record<AppName, AppConfig> = {
  AIDE: {
    key: "AIDE",
    name: "Guichet de l'Aide",
    shortName: "Aide",
    description: "Demandes et suivi des aides étudiantes.",
    url: "#",
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
