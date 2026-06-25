import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db";

/**
 * Récupérer tous les territoires
 */
export const getTerritoires = createServerFn("GET", async () => {
  try {
    const rows = await sql`SELECT * FROM public.territoires ORDER BY nom`;
    return { data: rows };
  } catch (error: any) {
    console.error("[DB] Erreur getTerritoires:", error.message);
    return { error: error.message };
  }
});

/**
 * Créer ou mettre à jour un territoire
 */
export const saveTerritoire = createServerFn("POST", async (payload: any) => {
  try {
    const { id, ...data } = payload;
    if (id) {
      await sql`
        UPDATE public.territoires 
        SET ${sql(data)} 
        WHERE id = ${id}
      `;
      return { success: true, message: "Territoire mis à jour" };
    } else {
      await sql`
        INSERT INTO public.territoires ${sql(data)}
      `;
      return { success: true, message: "Territoire créé" };
    }
  } catch (error: any) {
    console.error("[DB] Erreur saveTerritoire:", error.message);
    return { error: error.message };
  }
});

/**
 * Supprimer un territoire
 */
export const deleteTerritoire = createServerFn("POST", async (id: string) => {
  try {
    await sql`DELETE FROM public.territoires WHERE id = ${id}`;
    return { success: true };
  } catch (error: any) {
    console.error("[DB] Erreur deleteTerritoire:", error.message);
    return { error: error.message };
  }
});
