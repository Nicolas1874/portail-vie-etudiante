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
// SI AIDE intégré localement à la route /aide.
const SI_AIDE_URL = "/aide";
const SI_HANDICAP_URL = "https://id-preview--a9da78bf-246c-4781-90d1-2ab18d2b2bfa.lovable.app";
const SI_CVEC_URL = "https://id-preview--cce61189-fb49-4e26-bf32-bec23a30b14e.lovable.app";


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
    description: "Accompagnement et aménagements handicap (Handi-Décision).",
    url: SI_HANDICAP_URL,
    accent: "var(--accent-handicap)",
  },
  CVEC: {
    key: "CVEC",
    name: "CVEC",
    shortName: "CVEC",
    description: "Contribution à la vie étudiante et de campus (CVEC Harmony).",
    url: SI_CVEC_URL,
    accent: "var(--accent-cvec)",
  },
};

export const APP_LIST: AppConfig[] = [APPS.AIDE, APPS.HANDICAP, APPS.CVEC];
