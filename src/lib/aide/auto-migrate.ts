import { sql } from "./db";

export async function autoMigrate() {
  console.log("[AUTO-MIGRATE] Vérification des tables AIDE...");

  try {
    // 1. Création des Enums (si non existants)
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
          CREATE TYPE public.app_role AS ENUM ('admin', 'superviseur', 'agent', 'partenaire');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_structure') THEN
          CREATE TYPE public.type_structure AS ENUM ('guichet_aide', 'bij', 'cij', 'caf', 'autre');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usager_genre') THEN
          CREATE TYPE public.usager_genre AS ENUM ('f', 'h', 'autre', 'non_precise');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usager_situation') THEN
          CREATE TYPE public.usager_situation AS ENUM ('etudiant', 'lyceen', 'jeune_actif', 'demandeur_emploi', 'neet', 'autre');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_public') THEN
          CREATE TYPE public.type_public AS ENUM ('etudiant', 'pij', 'paej');
        END IF;
      END $$;
    `);

    // 2. Création des Tables de base
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.territoires (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        departement TEXT,
        accueille_etudiant BOOLEAN DEFAULT true,
        accueille_pij BOOLEAN DEFAULT false,
        accueille_paej BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.structures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        type public.type_structure NOT NULL DEFAULT 'autre',
        territoire_id UUID NOT NULL REFERENCES public.territoires(id),
        email_contact TEXT,
        telephone TEXT,
        adresse TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        nom TEXT,
        prenom TEXT,
        email TEXT NOT NULL UNIQUE,
        fonction TEXT,
        structure_id UUID REFERENCES public.structures(id),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.usagers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        date_naissance DATE,
        genre public.usager_genre NOT NULL DEFAULT 'non_precise',
        email TEXT,
        telephone TEXT,
        adresse TEXT,
        code_postal TEXT,
        ville TEXT,
        situation public.usager_situation NOT NULL DEFAULT 'autre',
        type_public public.type_public DEFAULT 'etudiant',
        territoire_id UUID NOT NULL REFERENCES public.territoires(id),
        structure_creatrice_id UUID NOT NULL REFERENCES public.structures(id),
        cree_par UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    console.log("[AUTO-MIGRATE] Migration terminée avec succès.");
  } catch (error: any) {
    console.error("[AUTO-MIGRATE] Erreur critique:", error.message);
  }
}
