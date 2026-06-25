import { createServerFn } from "@tanstack/react-start";
import { sql } from "./db.server";

/**
 * Récupérer toutes les structures avec leur territoire
 */
export const getStructures = createServerFn("GET", async () => {
  try {
    const rows = await sql`
      SELECT s.*, t.nom as territoire_nom 
      FROM public.structures s
      LEFT JOIN public.territoires t ON s.territoire_id = t.id
      ORDER BY s.nom
    `;
    // Adapter le format pour correspondre à l'attente du frontend (r.territoires.nom)
    const formatted = rows.map(r => ({
      ...r,
      territoires: { nom: r.territoire_nom }
    }));
    return { data: formatted };
  } catch (error: any) {
    console.error("[DB] Erreur getStructures:", error.message);
    return { error: error.message };
  }
});

/**
 * Créer ou mettre à jour une structure
 */
export const saveStructure = createServerFn("POST", async (payload: any) => {
  try {
    const { id, ...data } = payload;
    if (id) {
      await sql`
        UPDATE public.structures 
        SET ${sql(data)} 
        WHERE id = ${id}
      `;
      return { success: true, message: "Structure mise à jour" };
    } else {
      await sql`
        INSERT INTO public.structures ${sql(data)}
      `;
      return { success: true, message: "Structure créée" };
    }
  } catch (error: any) {
    console.error("[DB] Erreur saveStructure:", error.message);
    return { error: error.message };
  }
});

/**
 * Supprimer une structure
 */
export const deleteStructure = createServerFn("POST", async (id: string) => {
  try {
    await sql`DELETE FROM public.structures WHERE id = ${id}`;
    return { success: true };
  } catch (error: any) {
    console.error("[DB] Erreur deleteStructure:", error.message);
    return { error: error.message };
  }
});
