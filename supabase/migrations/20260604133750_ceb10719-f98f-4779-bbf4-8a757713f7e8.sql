
-- Drop the overly permissive policy that exposed PII (email/phone/etc) to anon
DROP POLICY IF EXISTS "Public can view registrants by group scoring code" ON public.tournament_registrations;

-- Replacement: SECURITY DEFINER RPCs that return ONLY non-PII scoring fields.

-- Returns the roster (safe columns) for a given group scoring code.
CREATE OR REPLACE FUNCTION public.get_group_scoring_roster(_tournament_id uuid, _code text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  group_position integer,
  playing_handicap numeric,
  course_handicap numeric,
  handicap numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.first_name, r.last_name, r.group_position,
         r.playing_handicap, r.course_handicap, r.handicap
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND r.group_scoring_code IS NOT NULL
    AND upper(r.group_scoring_code) = upper(_code)
  ORDER BY r.group_position NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_scoring_roster(uuid, text) TO anon, authenticated;

-- Returns 'group', 'individual', or NULL for a given code in a tournament.
-- Used by the scoring code login screen without leaking any registrant data.
CREATE OR REPLACE FUNCTION public.lookup_player_scoring_code(_tournament_id uuid, _code text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = _tournament_id
        AND group_scoring_code IS NOT NULL
        AND upper(group_scoring_code) = upper(_code)
    ) THEN 'group'
    WHEN EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = _tournament_id
        AND scoring_code IS NOT NULL
        AND upper(scoring_code) = upper(_code)
    ) THEN 'individual'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_player_scoring_code(uuid, text) TO anon, authenticated;
