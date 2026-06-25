import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db";

/**
 * Récupérer le profil utilisateur complet depuis l'email
 */
export const getProfileByEmail = createServerFn("GET", async (email: string) => {
  try {
    const [profile] = await sql`
      SELECT p.*, s.territoire_id 
      FROM public.profiles p
      LEFT JOIN public.structures s ON p.structure_id = s.id
      WHERE p.email = ${email}
    `;
    return { data: profile };
  } catch (error: any) {
    console.error("[DB] Erreur getProfileByEmail:", error.message);
    return { error: error.message };
  }
});

/**
 * Créer ou mettre à jour un profil
 */
export const syncProfile = createServerFn("POST", async (payload: any) => {
  try {
    const { email, ...data } = payload;
    const [existing] = await sql`SELECT id FROM public.profiles WHERE email = ${email}`;
    
    if (existing) {
      await sql`UPDATE public.profiles SET ${sql(data)} WHERE email = ${email}`;
    } else {
      await sql`INSERT INTO public.profiles ${sql({ email, ...data })}`;
    }
    return { success: true };
  } catch (error: any) {
    console.error("[DB] Erreur syncProfile:", error.message);
    return { error: error.message };
  }
});
