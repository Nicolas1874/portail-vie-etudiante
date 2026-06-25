import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db";

/**
 * Récupérer la liste des usagers avec filtres
 */
export const getUsagers = createServerFn("GET", async (filters: any) => {
  try {
    let query = sql`SELECT * FROM public.usagers`;
    
    // Logique de filtrage simplifiée pour l'exemple
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = sql`${query} WHERE nom ILIKE ${search} OR prenom ILIKE ${search}`;
    }
    
    const rows = await query` ORDER BY created_at DESC`;
    return { data: rows };
  } catch (error: any) {
    console.error("[DB] Erreur getUsagers:", error.message);
    return { error: error.message };
  }
});

/**
 * Créer un usager
 */
export const createUsager = createServerFn("POST", async (payload: any) => {
  try {
    const [row] = await sql`
      INSERT INTO public.usagers ${sql(payload)}
      RETURNING id
    `;
    return { data: row };
  } catch (error: any) {
    console.error("[DB] Erreur createUsager:", error.message);
    return { error: error.message };
  }
});

/**
 * Récupérer un usager par son ID
 */
export const getUsagerById = createServerFn("GET", async (id: string) => {
  try {
    const [row] = await sql`SELECT * FROM public.usagers WHERE id = ${id}`;
    return { data: row };
  } catch (error: any) {
    console.error("[DB] Erreur getUsagerById:", error.message);
    return { error: error.message };
  }
});
