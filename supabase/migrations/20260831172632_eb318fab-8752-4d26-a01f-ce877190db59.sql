REVOKE ALL ON FUNCTION public.notify_admin_new_tournament() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admin_new_tournament() TO service_role;