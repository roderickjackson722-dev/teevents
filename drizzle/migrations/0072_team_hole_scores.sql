ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS best_ball_counting_scores integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_drives_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_drives_per_player integer,
  ADD COLUMN IF NOT EXISTS handicap_allowance_tiers numeric[];

CREATE TABLE public.tournament_team_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_key text NOT NULL,
  member_ids uuid[] NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  hole_number integer NOT NULL,
  strokes integer NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_key, round_number, hole_number)
);
CREATE INDEX tournament_team_scores_members_idx ON public.tournament_team_scores USING gin (member_ids);

CREATE TABLE public.tournament_team_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_key text NOT NULL,
  member_ids uuid[] NOT NULL,
  round_number integer NOT NULL,
  hole_number integer NOT NULL,
  old_strokes integer,
  new_strokes integer,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournament_team_scores TO anon;
GRANT SELECT, DELETE ON public.tournament_team_scores TO authenticated;
GRANT ALL ON public.tournament_team_scores TO service_role;
GRANT SELECT ON public.tournament_team_score_history TO authenticated;
GRANT ALL ON public.tournament_team_score_history TO service_role;

ALTER TABLE public.tournament_team_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_team_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view team scores" ON public.tournament_team_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members clear team scores" ON public.tournament_team_scores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Public views team scores of published events" ON public.tournament_team_scores FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND t.site_published = true));
CREATE POLICY "Org members view team score history" ON public.tournament_team_score_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE OR REPLACE FUNCTION public.is_team_score_format(_fmt text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(_fmt, '') IN ('scramble_2','scramble_3','scramble_4','alternate_shot')
$$;

-- Team for a registration: its registered team (same group_id), otherwise its pairing group.
CREATE OR REPLACE FUNCTION public.team_member_ids(_registration_id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN r.group_id IS NOT NULL THEN (
      SELECT array_agg(x.id ORDER BY x.id) FROM public.tournament_registrations x
      WHERE x.tournament_id = r.tournament_id AND x.group_id = r.group_id
        AND lower(coalesce(x.status,'active')) <> 'wd')
    WHEN r.group_number IS NOT NULL THEN (
      SELECT array_agg(x.id ORDER BY x.id) FROM public.tournament_registrations x
      WHERE x.tournament_id = r.tournament_id AND x.group_number = r.group_number AND x.group_id IS NULL
        AND lower(coalesce(x.status,'active')) <> 'wd')
    ELSE ARRAY[r.id] END
  FROM public.tournament_registrations r WHERE r.id = _registration_id
$$;

-- For team-score formats, every score write becomes ONE team record per hole.
-- Runs after the existing submit/closed-round guards, so those still apply.
CREATE OR REPLACE FUNCTION public.redirect_to_team_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fmt text; v_members uuid[]; v_key text; v_old int; v_rn int;
BEGIN
  SELECT scoring_format INTO v_fmt FROM public.tournaments WHERE id = NEW.tournament_id;
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
  -- No per-player copies are kept for this hole.
  DELETE FROM public.tournament_scores
    WHERE tournament_id = NEW.tournament_id AND registration_id = ANY(v_members)
      AND coalesce(round_number,1) = v_rn AND hole_number = NEW.hole_number;
  RETURN NULL;
END $$;

CREATE TRIGGER zz_redirect_to_team_score AFTER INSERT OR UPDATE ON public.tournament_scores
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION public.redirect_to_team_score();

-- Read path: per-player rows plus each team record shown for every team member.
CREATE VIEW public.tournament_scores_with_teams WITH (security_invoker = true) AS
  SELECT s.id, s.tournament_id, s.registration_id, s.hole_number, s.strokes, coalesce(s.round_number,1) AS round_number, false AS from_team
  FROM public.tournament_scores s
  UNION ALL
  SELECT ts.id, ts.tournament_id, m.rid, ts.hole_number, ts.strokes, ts.round_number, true
  FROM public.tournament_team_scores ts CROSS JOIN LATERAL unnest(ts.member_ids) AS m(rid);
GRANT SELECT ON public.tournament_scores_with_teams TO anon, authenticated, service_role;

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
  ORDER BY r.last_name, r.first_name, s.round_number, s.hole_number, s.registration_id;
$function$;

CREATE OR REPLACE FUNCTION public.clear_group_hole_scores(_tournament_id uuid, _code text, _hole_number integer, _round_number integer DEFAULT 1, _registration_id uuid DEFAULT NULL::uuid, _group_number integer DEFAULT NULL::integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  rn int := COALESCE(_round_number, 1);
  removed int := 0;
  r2 int := 0;
  rec record;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RAISE EXCEPTION 'Missing scoring code'; END IF;
  IF _hole_number IS NULL OR _hole_number < 1 OR _hole_number > 18 THEN RAISE EXCEPTION 'Invalid hole number'; END IF;
  IF rn < 1 OR rn > 8 THEN rn := 1; END IF;
  IF public.is_tournament_round_closed(_tournament_id, rn) THEN
    RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', rn;
  END IF;
  allowed_ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF allowed_ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  IF _registration_id IS NOT NULL AND NOT (_registration_id = ANY(allowed_ids)) THEN
    RAISE EXCEPTION 'Player not in your group';
  END IF;

  DELETE FROM public.tournament_scores
  WHERE tournament_id = _tournament_id AND hole_number = _hole_number AND round_number = rn
    AND registration_id = ANY(allowed_ids)
    AND (_registration_id IS NULL OR registration_id = _registration_id);
  GET DIAGNOSTICS removed = ROW_COUNT;

  FOR rec IN DELETE FROM public.tournament_team_scores
    WHERE tournament_id = _tournament_id AND hole_number = _hole_number AND round_number = rn
      AND member_ids && allowed_ids
      AND (_registration_id IS NULL OR _registration_id = ANY(member_ids))
    RETURNING team_key, member_ids, strokes
  LOOP
    INSERT INTO public.tournament_team_score_history (tournament_id, team_key, member_ids, round_number, hole_number, old_strokes, new_strokes, changed_by)
    VALUES (_tournament_id, rec.team_key, rec.member_ids, rn, _hole_number, rec.strokes, NULL, auth.uid());
    r2 := r2 + 1;
  END LOOP;
  RETURN removed + r2;
END $function$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_team_scores;