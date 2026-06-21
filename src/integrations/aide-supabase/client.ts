// Client Supabase dédié au module AIDE (intégré depuis Guichet Connect).
// Par défaut, réutilise le Supabase du portail. Pour pointer vers un autre
// projet Supabase (celui d'origine de Guichet Connect), définissez
// VITE_AIDE_SUPABASE_URL et VITE_AIDE_SUPABASE_PUBLISHABLE_KEY dans .env.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_AIDE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    process.env.AIDE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_AIDE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.AIDE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "[AIDE] Variables Supabase manquantes (VITE_AIDE_SUPABASE_URL / VITE_AIDE_SUPABASE_PUBLISHABLE_KEY)."
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      storageKey: 'sb-aide-auth-token',
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
