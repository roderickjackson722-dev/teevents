ALTER TABLE public.division_skins_games
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.division_skins_games
  DROP CONSTRAINT IF EXISTS division_skins_games_round_number_check;
ALTER TABLE public.division_skins_games
  ADD CONSTRAINT division_skins_games_round_number_check CHECK (round_number >= 1);

DROP INDEX IF EXISTS public.division_skins_games_unique_division;
CREATE UNIQUE INDEX division_skins_games_unique_division_round
  ON public.division_skins_games (tournament_id, round_number, COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid));

DROP FUNCTION IF EXISTS public.get_public_division_skins(uuid);

CREATE FUNCTION public.get_public_division_skins(_tournament_id uuid)
 RETURNS TABLE(game_id uuid, game_name text, division_id uuid, division_name text, total_purse_cents integer,
               skin_format text, carryover boolean, round_number integer, hole_number integer, score integer,
               amount_cents integer, player_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name, g.division_id, d.tier_name, g.total_purse_cents,
         g.skin_format, g.carryover, g.round_number, w.hole_number, w.score, w.amount_cents,
         btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')) AS player_name
  FROM public.division_skins_games g
  JOIN public.tournaments t ON t.id = g.tournament_id
  LEFT JOIN public.tournament_tiers d ON d.id = g.division_id
  LEFT JOIN public.division_skin_winners w ON w.skins_game_id = g.id
  LEFT JOIN public.tournament_registrations r ON r.id = w.registration_id
  WHERE g.tournament_id = _tournament_id
    AND g.status = 'active'
    AND t.site_published = true
  ORDER BY g.round_number, d.display_order NULLS FIRST, w.hole_number;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_division_skins(uuid) TO anon, authenticated;