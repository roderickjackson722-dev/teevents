REVOKE ALL ON FUNCTION public.purge_old_leaderboard_performance_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_leaderboard_performance_log() TO service_role;