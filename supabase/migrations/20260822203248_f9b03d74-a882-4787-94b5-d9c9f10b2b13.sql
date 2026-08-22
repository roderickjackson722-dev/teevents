-- Part 2: WD status on registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS wd_reason TEXT,
  ADD COLUMN IF NOT EXISTS wd_at TIMESTAMPTZ;

-- Part 1: division skins games
CREATE TABLE IF NOT EXISTS public.division_skins_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id UUID REFERENCES public.tournament_tiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_purse_cents INTEGER NOT NULL DEFAULT 0,
  skin_format TEXT NOT NULL DEFAULT 'gross',
  carryover BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS division_skins_games_unique_division
  ON public.division_skins_games (tournament_id, division_id);

CREATE TABLE IF NOT EXISTS public.division_skin_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skins_game_id UUID NOT NULL REFERENCES public.division_skins_games(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  score INTEGER,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS division_skin_winners_game_idx ON public.division_skin_winners (skins_game_id, hole_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.division_skins_games TO authenticated;
GRANT ALL ON public.division_skins_games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.division_skin_winners TO authenticated;
GRANT ALL ON public.division_skin_winners TO service_role;

ALTER TABLE public.division_skins_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_skin_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage division skins games"
  ON public.division_skins_games FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = division_skins_games.tournament_id
    AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = division_skins_games.tournament_id
    AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Org members manage division skin winners"
  ON public.division_skin_winners FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.division_skins_games g JOIN public.tournaments t ON t.id = g.tournament_id
    WHERE g.id = division_skin_winners.skins_game_id
      AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.division_skins_games g JOIN public.tournaments t ON t.id = g.tournament_id
    WHERE g.id = division_skin_winners.skins_game_id
      AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))));

-- Exclude withdrawn players from the public leaderboard
CREATE OR REPLACE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
 RETURNS TABLE(registration_id uuid, hole_number integer, strokes integer, round_number integer, first_name text, last_name text, group_number integer, team_name text, flight_id uuid, flight_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.registration_id, s.hole_number, s.strokes, COALESCE(s.round_number, 1) AS round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name,
         r.flight_id,
         ft.tier_name AS flight_name
  FROM public.tournament_scores s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.tournament_tiers ft ON ft.id = r.flight_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.status, 'active')) <> 'wd'
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'void');
$function$;

-- Public read of skins payouts for published tournaments
CREATE OR REPLACE FUNCTION public.get_public_division_skins(_tournament_id uuid)
 RETURNS TABLE(game_id uuid, game_name text, division_id uuid, division_name text, total_purse_cents integer,
               skin_format text, carryover boolean, hole_number integer, score integer, amount_cents integer,
               player_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name, g.division_id, d.tier_name, g.total_purse_cents,
         g.skin_format, g.carryover, w.hole_number, w.score, w.amount_cents,
         btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')) AS player_name
  FROM public.division_skins_games g
  JOIN public.tournaments t ON t.id = g.tournament_id
  LEFT JOIN public.tournament_tiers d ON d.id = g.division_id
  LEFT JOIN public.division_skin_winners w ON w.skins_game_id = g.id
  LEFT JOIN public.tournament_registrations r ON r.id = w.registration_id
  WHERE g.tournament_id = _tournament_id
    AND g.status = 'active'
    AND t.site_published = true
  ORDER BY d.display_order NULLS FIRST, w.hole_number;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_division_skins(uuid) TO anon, authenticated;