ALTER TABLE public.league_event_registrations
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS manual_notes TEXT,
  ADD COLUMN IF NOT EXISTS added_by UUID,
  ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;

ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS leaderboard_show_gross BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS leaderboard_show_net BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.get_league_event_leaderboard(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev record;
  lg record;
  crs record;
  result jsonb;
BEGIN
  SELECT * INTO ev FROM league_events WHERE id = _event_id;
  IF ev IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO lg FROM golf_leagues WHERE id = ev.league_id;
  IF ev.league_course_id IS NOT NULL THEN
    SELECT * INTO crs FROM league_courses WHERE id = ev.league_course_id;
  END IF;

  SELECT jsonb_build_object(
    'found', true,
    'event_id', ev.id,
    'event_name', ev.event_name,
    'event_date', ev.event_date,
    'format_type', ev.format_type,
    'holes', COALESCE(ev.holes, 18),
    'course_name', COALESCE(crs.course_name, ev.course_name),
    'hole_pars', crs.hole_pars,
    'league_name', lg.league_name,
    'league_slug', lg.league_slug,
    'league_logo_url', lg.logo_url,
    'show_gross', COALESCE(lg.leaderboard_show_gross, true),
    'show_net', COALESCE(lg.leaderboard_show_net, true),
    'teams', COALESCE((
      SELECT jsonb_agg(t ORDER BY t->>'team_name')
      FROM (
        SELECT jsonb_build_object(
          'pairing_id', p.id,
          'team_name', p.team_name,
          'holes', COALESCE(p.holes, ev.holes, 18),
          'player1_name', m1.member_name,
          'player2_name', m2.member_name,
          'player1_handicap', m1.handicap_index,
          'player2_handicap', m2.handicap_index,
          'scores', COALESCE((
            SELECT jsonb_object_agg(s.hole_number::text, s.gross_score)
            FROM league_team_scores s
            WHERE s.pairing_id = p.id AND s.gross_score IS NOT NULL
          ), '{}'::jsonb)
        ) AS t
        FROM league_team_pairings p
        LEFT JOIN league_members m1 ON m1.id = p.player1_id
        LEFT JOIN league_members m2 ON m2.id = p.player2_id
        WHERE p.event_id = ev.id
      ) x
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_league_event_leaderboard(uuid) TO anon, authenticated, service_role;