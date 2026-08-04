ALTER TABLE public.league_point_systems ADD COLUMN IF NOT EXISTS participation_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.league_standings ADD COLUMN IF NOT EXISTS prize_money_cents integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_league_season_standings(_league_slug text)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  points integer,
  wins integer,
  losses integer,
  ties integer,
  matches_played integer,
  total_gross integer,
  total_net integer,
  prize_money_cents integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.member_id,
         m.member_name,
         s.points,
         s.wins,
         s.losses,
         s.ties,
         s.matches_played,
         s.total_gross,
         s.total_net,
         s.prize_money_cents
  FROM public.league_standings s
  JOIN public.golf_leagues l ON l.id = s.league_id
  JOIN public.league_members m ON m.id = s.member_id
  WHERE l.league_slug = _league_slug
  ORDER BY s.points DESC NULLS LAST, s.total_net ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_league_season_standings(text) TO anon, authenticated;