
-- =====================================================
-- PHASE 1.3 : Restreindre les fonctions SECURITY DEFINER
-- =====================================================
-- Les fonctions restent utilisables par les policies RLS (qui s'exécutent
-- avec les privilèges du propriétaire) mais ne sont plus directement
-- exécutables par les utilisateurs connectés via l'API PostgREST.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_name, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid, app_name) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_app_access(uuid, app_name) FROM PUBLIC, anon, authenticated;

-- =====================================================
-- PHASE 3 : Table d'audit (append-only)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_email text,
  application app_name,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_application ON public.audit_logs (application);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Fonction utilitaire : super-admin = admin sur les 3 applications
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(DISTINCT application)
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) >= 3;
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Lecture : super-admins uniquement
CREATE POLICY "Super admins read audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Aucune insert/update/delete depuis le client : tout passe par server functions
-- avec supabaseAdmin (qui bypasse RLS). Pas de policy = bloqué côté client.

-- =====================================================
-- PHASE 4 : Table des challenges 2FA email
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_email ON public.mfa_challenges (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON public.mfa_challenges (expires_at);

ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
-- Aucune policy : toutes les opérations passent par server functions avec supabaseAdmin

-- =====================================================
-- Désactiver les inscriptions publiques sera fait via configure_auth.
-- Les invitations restent fonctionnelles car gérées côté serveur (admin SDK).
-- =====================================================
