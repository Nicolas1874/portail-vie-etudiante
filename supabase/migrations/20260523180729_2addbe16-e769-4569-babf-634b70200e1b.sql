
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_name, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_app_access(UUID, public.app_name) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(UUID, public.app_name) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
