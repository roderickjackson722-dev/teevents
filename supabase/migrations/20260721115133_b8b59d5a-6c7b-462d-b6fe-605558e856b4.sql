
REVOKE SELECT ON public.league_members FROM anon;

GRANT SELECT (id, league_id, member_name, handicap_index, created_at, updated_at)
  ON public.league_members TO anon;
