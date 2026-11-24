ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS custom_scoring jsonb;

CREATE OR REPLACE FUNCTION public.is_team_score_format(_fmt text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(_fmt, '') IN ('scramble_2','scramble_3','scramble_4','alternate_shot','modified_alternate_shot')
$$;

CREATE OR REPLACE FUNCTION public.hole_score_format(_tid uuid, _round int, _hole int)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((
    SELECT seg->>'format'
    FROM jsonb_array_elements(CASE WHEN coalesce((t.custom_scoring->>'enabled')::boolean, false) THEN coalesce(t.custom_scoring->'rounds','[]'::jsonb) ELSE '[]'::jsonb END) r,
         jsonb_array_elements(coalesce(r->'segments','[]'::jsonb)) seg
    WHERE (r->>'round')::int = coalesce(_round,1)
      AND _hole BETWEEN (seg->>'from')::int AND (seg->>'to')::int
    LIMIT 1), t.scoring_format)
  FROM public.tournaments t WHERE t.id = _tid
$$;

CREATE OR REPLACE FUNCTION public.hole_hidden(_tid uuid, _round int, _hole int)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((
    SELECT bool_or(_hole BETWEEN (r->'hidden'->>'from')::int AND (r->'hidden'->>'to')::int)
    FROM public.tournaments t, jsonb_array_elements(coalesce(t.custom_scoring->'rounds','[]'::jsonb)) r
    WHERE t.id = _tid AND coalesce((t.custom_scoring->>'enabled')::boolean, false)
      AND (r->>'round')::int = coalesce(_round,1)
      AND jsonb_typeof(r->'hidden') = 'object'
      AND NOT EXISTS (SELECT 1 FROM public.score_round_status rs WHERE rs.tournament_id = _tid AND rs.round_number = coalesce(_round,1) AND rs.published_at IS NOT NULL)
  ), false)
$$;
GRANT EXECUTE ON FUNCTION public.hole_score_format(uuid,int,int), public.hole_hidden(uuid,int,int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.redirect_to_team_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fmt text; v_members uuid[]; v_key text; v_old int; v_rn int;
BEGIN
  v_fmt := public.hole_score_format(NEW.tournament_id, coalesce(NEW.round_number,1), NEW.hole_number);
  IF NOT public.is_team_score_format(v_fmt) THEN RETURN NULL; END IF;
  v_members := coalesce(public.team_member_ids(NEW.registration_id), ARRAY[NEW.registration_id]);
  v_key := array_to_string(v_members, ',');
  v_rn := coalesce(NEW.round_number, 1);
  SELECT strokes INTO v_old FROM public.tournament_team_scores
    WHERE tournament_id = NEW.tournament_id AND team_key = v_key AND round_number = v_rn AND hole_number = NEW.hole_number;
  INSERT INTO public.tournament_team_scores (tournament_id, team_key, member_ids, round_number, hole_number, strokes, updated_by)
  VALUES (NEW.tournament_id, v_key, v_members, v_rn, NEW.hole_number, NEW.strokes, auth.uid())
  ON CONFLICT (tournament_id, team_key, round_number, hole_number)
  DO UPDATE SET strokes = EXCLUDED.strokes, member_ids = EXCLUDED.member_ids, updated_by = EXCLUDED.updated_by, updated_at = now();
  IF v_old IS DISTINCT FROM NEW.strokes THEN
    INSERT INTO public.tournament_team_score_history (tournament_id, team_key, member_ids, round_number, hole_number, old_strokes, new_strokes, changed_by)
    VALUES (NEW.tournament_id, v_key, v_members, v_rn, NEW.hole_number, v_old, NEW.strokes, auth.uid());
  END IF;
  DELETE FROM public.tournament_scores
    WHERE tournament_id = NEW.tournament_id AND registration_id = ANY(v_members)
      AND coalesce(round_number,1) = v_rn AND hole_number = NEW.hole_number;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.sv_on_player_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fmt text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.sv_mode(OLD.tournament_id) = 'off' THEN RETURN NULL; END IF;
    DELETE FROM public.score_hole_status WHERE tournament_id=OLD.tournament_id AND round_number=coalesce(OLD.round_number,1)
      AND hole_number=OLD.hole_number AND subject_key=OLD.registration_id::text;
    INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_user_id)
    VALUES (OLD.tournament_id, coalesce(OLD.round_number,1), OLD.hole_number, OLD.registration_id::text, 'cleared', auth.uid());
    RETURN NULL;
  END IF;
  IF public.sv_mode(NEW.tournament_id) = 'off' THEN RETURN NULL; END IF;
  v_fmt := public.hole_score_format(NEW.tournament_id, coalesce(NEW.round_number,1), NEW.hole_number);
  IF public.is_team_score_format(v_fmt) THEN RETURN NULL; END IF;
  PERFORM public.sv_record_entry(NEW.tournament_id, coalesce(NEW.round_number,1), NEW.hole_number, NEW.registration_id::text, ARRAY[NEW.registration_id], NEW.strokes);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
 RETURNS TABLE(registration_id uuid, hole_number integer, strokes integer, round_number integer, first_name text, last_name text, group_number integer, team_name text, flight_id uuid, flight_name text, group_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.registration_id, s.hole_number, s.strokes, s.round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name,
         r.flight_id, ft.tier_name AS flight_name, r.group_id
  FROM public.tournament_scores_with_teams s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.tournament_tiers ft ON ft.id = r.flight_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.status, 'active')) <> 'wd'
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'void')
    AND (coalesce(t.score_verification,'off') = 'off' OR NOT EXISTS (
      SELECT 1 FROM public.score_hole_status hs WHERE hs.tournament_id = s.tournament_id AND hs.round_number = s.round_number
        AND hs.hole_number = s.hole_number AND hs.status = 'disputed' AND s.registration_id = ANY(hs.member_ids)))
    AND (t.custom_scoring IS NULL OR NOT public.hole_hidden(s.tournament_id, s.round_number, s.hole_number))
  ORDER BY r.last_name, r.first_name, s.round_number, s.hole_number, s.registration_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_round_published(_tournament_id uuid)
RETURNS integer[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(round_number ORDER BY round_number), '{}') FROM public.score_round_status
  WHERE tournament_id = _tournament_id AND published_at IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_public_round_published(uuid) TO anon, authenticated;