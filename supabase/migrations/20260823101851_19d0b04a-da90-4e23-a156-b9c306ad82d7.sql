ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS live_scoring_allow_email_login boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.scoring_code_group_ids(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb;
  v_owner uuid;
  v_group text;
  v_ids uuid[];
  v_group_num integer;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  -- Prefer a code owner that is actually assigned in this round's pairings so a
  -- code shared by several groups still resolves to the right one.
  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    SELECT r.id INTO v_owner
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND (
        (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code)))
        OR (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(trim(_code)))
      )
      AND v_assign -> r.id::text ->> 'g' IS NOT NULL
    ORDER BY (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code))) DESC,
             r.group_leader DESC NULLS LAST, r.created_at, r.id
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    SELECT r.id INTO v_owner
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND (
        (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code)))
        OR (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(trim(_code)))
      )
    ORDER BY (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code))) DESC,
             r.group_leader DESC NULLS LAST, r.created_at, r.id
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    v_group := v_assign -> v_owner::text ->> 'g';
    IF v_group IS NOT NULL THEN
      SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
        INTO v_ids
      FROM public.tournament_registrations r
      WHERE r.tournament_id = _tournament_id
        AND v_assign -> r.id::text ->> 'g' = v_group;
      RETURN v_ids;
    END IF;
  END IF;

  -- No round snapshot entry for this owner: fall back to their saved group so
  -- previously emailed codes keep working.
  SELECT r.group_number INTO v_group_num
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
$function$;

-- ATL Golf Championships: round 2 is in play and codes were emailed for it.
UPDATE public.tournaments
SET pairings_config = jsonb_set(coalesce(pairings_config, '{}'::jsonb), '{activeRound}', '2'::jsonb, true),
    live_scoring_allow_email_login = false
WHERE id = '8d241ebc-4fd3-4dcb-bfad-27f7e92e9c6a';