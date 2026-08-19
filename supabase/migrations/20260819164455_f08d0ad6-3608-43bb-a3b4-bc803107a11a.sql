ALTER TABLE public.tournament_scores
  ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS public.tournament_scores_reg_hole_unique;
CREATE UNIQUE INDEX IF NOT EXISTS tournament_scores_reg_round_hole_unique
  ON public.tournament_scores (registration_id, round_number, hole_number);

CREATE OR REPLACE FUNCTION public.save_group_scores(_tournament_id uuid, _code text, _scores jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

    INSERT INTO public.tournament_scores (tournament_id, registration_id, hole_number, strokes, round_number)
    VALUES (_tournament_id, rid, hn, st, rn)
    ON CONFLICT (registration_id, round_number, hole_number) DO UPDATE SET strokes = EXCLUDED.strokes;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_public_leaderboard_scores(uuid);
CREATE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
RETURNS TABLE (
  registration_id uuid,
  hole_number integer,
  strokes integer,
  round_number integer,
  first_name text,
  last_name text,
  group_number integer,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.registration_id, s.hole_number, s.strokes, COALESCE(s.round_number, 1) AS round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name
  FROM public.tournament_scores s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.payment_status, '')) = 'paid';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard_scores(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_group_scores(uuid, text, jsonb) TO anon, authenticated;