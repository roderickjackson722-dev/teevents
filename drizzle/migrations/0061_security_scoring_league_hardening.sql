-- Cryptographically random scoring codes
CREATE OR REPLACE FUNCTION public.assign_group_scoring_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  existing_code TEXT; new_code TEXT;
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  rb bytea; i INT;
BEGIN
  IF NEW.group_number IS NULL THEN RETURN NEW; END IF;
  IF NEW.group_scoring_code IS NOT NULL AND NEW.group_scoring_code <> '' THEN RETURN NEW; END IF;
  SELECT group_scoring_code INTO existing_code FROM public.tournament_registrations
  WHERE tournament_id = NEW.tournament_id AND group_number = NEW.group_number
    AND group_scoring_code IS NOT NULL AND group_scoring_code <> '' LIMIT 1;
  IF existing_code IS NOT NULL THEN NEW.group_scoring_code := existing_code; RETURN NEW; END IF;
  LOOP
    rb := extensions.gen_random_bytes(6);
    new_code := '';
    FOR i IN 0..5 LOOP
      new_code := new_code || substr(alphabet, 1 + (get_byte(rb, i) % 32), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = NEW.tournament_id AND group_scoring_code = new_code);
  END LOOP;
  NEW.group_scoring_code := new_code;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_scoring_code()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.scoring_code IS NULL OR NEW.scoring_code = '' THEN
    NEW.scoring_code := upper(encode(extensions.gen_random_bytes(3), 'hex'));
    WHILE EXISTS (SELECT 1 FROM public.tournament_registrations WHERE scoring_code = NEW.scoring_code AND id != NEW.id) LOOP
      NEW.scoring_code := upper(encode(extensions.gen_random_bytes(3), 'hex'));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Private league event leaderboards are visible only to managers/admins
CREATE OR REPLACE FUNCTION public.get_league_event_leaderboard(_event_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ev record; lg record; crs record; result jsonb;
BEGIN
  SELECT * INTO ev FROM league_events WHERE id = _event_id;
  IF ev IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT * INTO lg FROM golf_leagues WHERE id = ev.league_id;
  IF lg IS NULL OR NOT (COALESCE(lg.is_public, false)
      OR (auth.uid() IS NOT NULL AND (public.is_org_member(auth.uid(), lg.organization_id) OR public.has_role(auth.uid(), 'admin')))) THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  IF ev.league_course_id IS NOT NULL THEN
    SELECT * INTO crs FROM league_courses WHERE id = ev.league_course_id;
  END IF;
  SELECT jsonb_build_object(
    'found', true, 'event_id', ev.id, 'event_name', ev.event_name, 'event_date', ev.event_date,
    'format_type', ev.format_type, 'holes', COALESCE(ev.holes, 18), 'start_hole', COALESCE(ev.start_hole, 1),
    'course_name', COALESCE(crs.course_name, ev.course_name), 'hole_pars', crs.hole_pars,
    'league_name', lg.league_name, 'league_slug', lg.league_slug, 'league_logo_url', lg.logo_url,
    'show_gross', COALESCE(lg.leaderboard_show_gross, true), 'show_net', COALESCE(lg.leaderboard_show_net, true),
    'teams', COALESCE((
      SELECT jsonb_agg(t ORDER BY t->>'team_name') FROM (
        SELECT jsonb_build_object(
          'pairing_id', p.id, 'team_name', p.team_name, 'holes', COALESCE(p.holes, ev.holes, 18),
          'player1_name', m1.member_name, 'player2_name', m2.member_name,
          'player1_handicap', m1.handicap_index, 'player2_handicap', m2.handicap_index,
          'scores', COALESCE((SELECT jsonb_object_agg(s.hole_number::text, s.gross_score)
            FROM league_team_scores s WHERE s.pairing_id = p.id AND s.gross_score IS NOT NULL), '{}'::jsonb)
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
$function$;

-- Season standings: public leagues, managers, or a member presenting their code
DROP FUNCTION IF EXISTS public.get_league_season_standings(text);
CREATE FUNCTION public.get_league_season_standings(_league_slug text, _member_code text DEFAULT NULL)
 RETURNS TABLE(member_id uuid, member_name text, points integer, wins integer, losses integer, ties integer, matches_played integer, total_gross integer, total_net integer, prize_money_cents integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.member_id, m.member_name, s.points, COALESCE(s.wins_override, s.wins) AS wins,
         s.losses, s.ties, s.matches_played, s.total_gross, s.total_net, s.prize_money_cents
  FROM public.league_standings s
  JOIN public.golf_leagues l ON l.id = s.league_id
  JOIN public.league_members m ON m.id = s.member_id
  WHERE l.league_slug = _league_slug
    AND (COALESCE(l.is_public, false)
      OR (auth.uid() IS NOT NULL AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin')))
      OR (_member_code IS NOT NULL AND EXISTS (SELECT 1 FROM public.league_members mm
            WHERE mm.league_id = l.id AND mm.scoring_code IS NOT NULL AND upper(mm.scoring_code) = upper(trim(_member_code)))))
  ORDER BY s.points DESC NULLS LAST, s.total_net ASC NULLS LAST;
$function$;
GRANT EXECUTE ON FUNCTION public.get_league_season_standings(text, text) TO anon, authenticated;

-- Round group lookup requires a scoring code from this event, or manager access
DROP FUNCTION IF EXISTS public.get_round_group_by_number(uuid, integer, integer);
CREATE FUNCTION public.get_round_group_by_number(_tournament_id uuid, _group_number integer, _round_number integer DEFAULT 1, _code text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb; ids uuid[]; players jsonb; scores jsonb; v_org uuid;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text), t.organization_id INTO v_assign, v_org
  FROM public.tournaments t WHERE t.id = _tournament_id;
  IF NOT (
    (auth.uid() IS NOT NULL AND (public.is_org_member(auth.uid(), v_org) OR public.has_role(auth.uid(), 'admin')))
    OR (_code IS NOT NULL AND length(trim(_code)) >= 4 AND EXISTS (
      SELECT 1 FROM public.tournament_registrations r0
      WHERE r0.tournament_id = _tournament_id
        AND (upper(r0.scoring_code) = upper(trim(_code)) OR upper(r0.group_scoring_code) = upper(trim(_code)))))
  ) THEN RETURN NULL; END IF;
  IF v_assign IS NULL OR jsonb_typeof(v_assign) <> 'object' THEN RETURN NULL; END IF;

  SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
    INTO ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id AND (v_assign -> r.id::text ->> 'g')::integer = _group_number;
  IF ids IS NULL THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'first_name', r.first_name, 'last_name', r.last_name, 'handicap', r.handicap,
      'group_number', _group_number, 'playing_handicap', r.playing_handicap,
      'strokes_per_hole', r.strokes_per_hole, 'scoring_code', r.scoring_code,
      'starting_hole', r.starting_hole, 'is_captain', r.is_captain, 'group_id', r.group_id,
      'team_name', COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''))
    ) ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name
  ), '[]'::jsonb) INTO players
  FROM public.tournament_registrations r
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  WHERE r.id = ANY(ids);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id, 'hole_number', s.hole_number,
    'strokes', s.strokes, 'round_number', coalesce(s.round_number, 1)
  )), '[]'::jsonb) INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id AND s.registration_id = ANY(ids) AND s.round_number = rn;

  RETURN jsonb_build_object('players', players, 'scores', scores, 'group_number', _group_number, 'round_number', rn);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_round_group_by_number(uuid, integer, integer, text) TO anon, authenticated;

-- Member code lookup only for the signed-in owner of that email
CREATE OR REPLACE FUNCTION public.lookup_league_member_code_by_email(_league_id uuid, _email text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.scoring_code
  FROM public.league_members m
  WHERE m.league_id = _league_id
    AND auth.uid() IS NOT NULL
    AND lower(trim(_email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND lower(trim(m.email)) = lower(trim(_email))
  LIMIT 1
$function$;
REVOKE EXECUTE ON FUNCTION public.lookup_league_member_code_by_email(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_league_member_code_by_email(uuid, text) TO authenticated;

-- Setup progress is recomputed only by backend code
REVOKE EXECUTE ON FUNCTION public.recompute_tournament_setup_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_tournament_setup_progress(uuid) TO service_role;

-- League paid-access fields can only be changed by backend payment code or platform admins
CREATE OR REPLACE FUNCTION public.guard_league_access_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.access_status := 'unpaid';
      NEW.access_paid_at := NULL;
      NEW.access_amount_cents := NULL;
    ELSE
      NEW.access_status := OLD.access_status;
      NEW.access_paid_at := OLD.access_paid_at;
      NEW.access_amount_cents := OLD.access_amount_cents;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS guard_league_access_fields ON public.golf_leagues;
CREATE TRIGGER guard_league_access_fields BEFORE INSERT OR UPDATE ON public.golf_leagues
FOR EACH ROW EXECUTE FUNCTION public.guard_league_access_fields();