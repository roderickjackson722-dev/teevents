CREATE OR REPLACE FUNCTION public.lookup_league_member_by_code(_league_slug text, _code text)
RETURNS TABLE (
  id uuid,
  league_id uuid,
  member_name text,
  email text,
  phone text,
  handicap_index numeric,
  course_handicap integer,
  playing_handicap integer,
  membership_status text,
  membership_fee_paid boolean,
  membership_fee_cents integer,
  scoring_code text,
  shirt_size text,
  avg_18_score integer,
  avg_9_score integer,
  profile_image_url text,
  join_date date,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.league_id, m.member_name, m.email, m.phone, m.handicap_index,
         m.course_handicap, m.playing_handicap, m.membership_status, m.membership_fee_paid,
         m.membership_fee_cents, m.scoring_code, m.shirt_size, m.avg_18_score, m.avg_9_score,
         m.profile_image_url, m.join_date, m.is_active
  FROM public.league_members m
  JOIN public.golf_leagues l ON l.id = m.league_id
  WHERE upper(trim(m.scoring_code)) = upper(trim(_code))
    AND (
      _league_slug IS NULL
      OR l.league_slug = _league_slug
      OR l.id::text = _league_slug
    )
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_member_by_code(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_league_member_code_by_email(_league_id uuid, _email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.scoring_code
  FROM public.league_members m
  WHERE m.league_id = _league_id
    AND lower(trim(m.email)) = lower(trim(_email))
    AND lower(trim(_email)) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_member_code_by_email(uuid, text) TO authenticated;