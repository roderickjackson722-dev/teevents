-- Round closure tracking for multi-round tournaments
CREATE TABLE IF NOT EXISTS public.tournament_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number >= 1 AND round_number <= 8),
  status text NOT NULL DEFAULT 'active',
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_rounds TO authenticated;
GRANT SELECT ON public.tournament_rounds TO anon;
GRANT ALL ON public.tournament_rounds TO service_role;

ALTER TABLE public.tournament_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Round status is publicly readable"
  ON public.tournament_rounds FOR SELECT
  USING (true);

CREATE POLICY "Organizers manage their tournament rounds"
  ON public.tournament_rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_rounds.tournament_id
        AND (
          public.is_org_member(auth.uid(), t.organization_id)
          OR public.has_tournament_role(auth.uid(), t.id)
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_rounds.tournament_id
        AND (
          public.is_org_member(auth.uid(), t.organization_id)
          OR public.has_tournament_role(auth.uid(), t.id)
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- Player's assigned starting hole (shotgun starts)
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS starting_hole integer;

-- Block player-side writes to a closed round
CREATE OR REPLACE FUNCTION public.is_tournament_round_closed(_tournament_id uuid, _round_number integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_rounds
    WHERE tournament_id = _tournament_id
      AND round_number = COALESCE(_round_number, 1)
      AND status = 'closed'
  )
$$;

CREATE OR REPLACE FUNCTION public.save_group_scores(_tournament_id uuid, _code text, _scores jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  group_num integer;
  row jsonb;
  rid uuid;
  hn int;
  st int;
  rn int;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Missing scoring code';
  END IF;

  SELECT group_number INTO group_num
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND (
      (group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_code)) OR
      (scoring_code IS NOT NULL AND upper(scoring_code) = upper(_code))
    )
  LIMIT 1;

  IF group_num IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  SELECT array_agg(id) INTO allowed_ids
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = group_num;

  FOR row IN SELECT * FROM jsonb_array_elements(_scores) LOOP
    rid := (row->>'registration_id')::uuid;
    hn  := (row->>'hole_number')::int;
    st  := (row->>'strokes')::int;
    rn  := COALESCE((row->>'round_number')::int, 1);
    IF rid IS NULL OR hn IS NULL OR st IS NULL THEN CONTINUE; END IF;
    IF NOT (rid = ANY(allowed_ids)) THEN CONTINUE; END IF;
    IF hn < 1 OR hn > 18 OR st < 1 OR st > 20 THEN CONTINUE; END IF;
    IF rn < 1 OR rn > 8 THEN rn := 1; END IF;
    IF public.is_tournament_round_closed(_tournament_id, rn) THEN
      RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', rn;
    END IF;

    INSERT INTO public.tournament_scores (tournament_id, registration_id, hole_number, strokes, round_number)
    VALUES (_tournament_id, rid, hn, st, rn)
    ON CONFLICT (registration_id, round_number, hole_number) DO UPDATE SET strokes = EXCLUDED.strokes;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.clear_group_hole_scores(_tournament_id uuid, _code text, _hole_number integer, _round_number integer DEFAULT 1, _registration_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  group_num integer;
  rn int := COALESCE(_round_number, 1);
  removed int := 0;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Missing scoring code';
  END IF;
  IF _hole_number IS NULL OR _hole_number < 1 OR _hole_number > 18 THEN
    RAISE EXCEPTION 'Invalid hole number';
  END IF;
  IF rn < 1 OR rn > 8 THEN rn := 1; END IF;

  IF public.is_tournament_round_closed(_tournament_id, rn) THEN
    RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', rn;
  END IF;

  SELECT group_number INTO group_num
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND (
      (group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_code)) OR
      (scoring_code IS NOT NULL AND upper(scoring_code) = upper(_code))
    )
  LIMIT 1;

  IF group_num IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  SELECT array_agg(id) INTO allowed_ids
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = group_num;

  IF _registration_id IS NOT NULL AND NOT (_registration_id = ANY(allowed_ids)) THEN
    RAISE EXCEPTION 'Player not in your group';
  END IF;

  DELETE FROM public.tournament_scores
  WHERE tournament_id = _tournament_id
    AND hole_number = _hole_number
    AND round_number = rn
    AND registration_id = ANY(allowed_ids)
    AND (_registration_id IS NULL OR registration_id = _registration_id);

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END $function$;