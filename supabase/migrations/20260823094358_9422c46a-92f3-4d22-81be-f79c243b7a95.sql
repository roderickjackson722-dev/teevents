ALTER TABLE public.tournament_scores
  DROP CONSTRAINT IF EXISTS tournament_scores_registration_id_hole_number_key;

ALTER TABLE public.score_edits
  ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS score_edits_tournament_round_idx
  ON public.score_edits (tournament_id, round_number, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_closed_tournament_round_score_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_tournament_round_closed(NEW.tournament_id, COALESCE(NEW.round_number, 1)) THEN
    RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', COALESCE(NEW.round_number, 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_closed_tournament_round_score_write ON public.tournament_scores;
CREATE TRIGGER prevent_closed_tournament_round_score_write
BEFORE INSERT OR UPDATE ON public.tournament_scores
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_tournament_round_score_write();

CREATE OR REPLACE FUNCTION public.scoring_code_group_ids(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assign jsonb;
  v_owner uuid;
  v_group text;
  v_ids uuid[];
  v_group_num integer;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT r.id
    INTO v_owner
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND r.scoring_code IS NOT NULL
    AND upper(r.scoring_code) = upper(trim(_code))
  ORDER BY r.created_at, r.id
  LIMIT 1;

  IF v_owner IS NULL THEN
    SELECT r.id
      INTO v_owner
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND r.group_scoring_code IS NOT NULL
      AND upper(r.group_scoring_code) = upper(trim(_code))
    ORDER BY r.group_leader DESC NULLS LAST, r.created_at, r.id
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    v_group := v_assign -> v_owner::text ->> 'g';
    IF v_group IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
      INTO v_ids
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND v_assign -> r.id::text ->> 'g' = v_group;
    RETURN v_ids;
  END IF;

  SELECT r.group_number
    INTO v_group_num
  FROM public.tournament_registrations r
  WHERE r.id = v_owner;

  IF v_group_num IS NULL THEN
    RETURN ARRAY[v_owner];
  END IF;

  SELECT array_agg(r.id ORDER BY r.group_position NULLS LAST, r.last_name, r.first_name)
    INTO v_ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND r.group_number = v_group_num;

  RETURN v_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scoring_code_group_ids(uuid, text, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_round_scoring_group(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  players jsonb;
  scores jsonb;
  ids uuid[];
  v_assign jsonb;
  v_group text;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
  IF ids IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    SELECT v_assign -> r.id::text ->> 'g'
      INTO v_group
    FROM public.tournament_registrations r
    WHERE r.id = ANY(ids)
      AND v_assign -> r.id::text ->> 'g' IS NOT NULL
    ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.id
    LIMIT 1;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'first_name', r.first_name,
      'last_name', r.last_name,
      'handicap', r.handicap,
      'group_number', COALESCE(v_group::integer, r.group_number),
      'playing_handicap', r.playing_handicap,
      'strokes_per_hole', r.strokes_per_hole,
      'scoring_code', r.scoring_code,
      'starting_hole', r.starting_hole
    ) ORDER BY COALESCE(
      CASE WHEN v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object'
           THEN (v_assign -> r.id::text ->> 'p')::integer END,
      r.group_position,
      999
    ), r.last_name, r.first_name
  ), '[]'::jsonb)
    INTO players
  FROM public.tournament_registrations r
  WHERE r.id = ANY(ids);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id,
    'hole_number', s.hole_number,
    'strokes', s.strokes,
    'round_number', coalesce(s.round_number, 1)
  )), '[]'::jsonb)
    INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id
    AND s.registration_id = ANY(ids)
    AND s.round_number = rn;

  RETURN jsonb_build_object(
    'players', players,
    'scores', scores,
    'group_number', COALESCE(v_group::integer, NULL),
    'round_number', rn
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_round_scoring_group(uuid, text, integer) TO anon, authenticated;