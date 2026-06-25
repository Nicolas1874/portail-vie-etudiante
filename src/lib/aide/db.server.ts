import postgres from "postgres";

/**
 * Client PostgreSQL pour Clever Cloud.
 * Utilise la variable d'environnement POSTGRESQL_ADDON_URI fournie par Clever Cloud.
 */

const connectionString = process.env.POSTGRESQL_ADDON_URI || process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.error("[DB] Erreur: POSTGRESQL_ADDON_URI manquante sur Clever Cloud.");
}

// Client PostgreSQL
export const sql = postgres(connectionString || "postgres://localhost:5432/postgres", {
  ssl: connectionString?.includes("supabase") || process.env.NODE_ENV === "production" ? "require" : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Helper pour exécuter du SQL brut (utilisé pour les migrations)
 */
export async function runMigration(query: string) {
  try {
    await sql.unsafe(query);
    return { success: true };
  } catch (error: any) {
    console.error("[DB-MIGRATION] Erreur:", error.message);
    return { success: false, error: error.message };
  }
}
