
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_owns_experiment(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_experiment(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
