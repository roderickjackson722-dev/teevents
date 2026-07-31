-- 1) Remove broad public exposure of league_members (email, phone, notes, scoring codes)
DROP POLICY IF EXISTS "Public can view members of public leagues" ON public.league_members;
DROP POLICY IF EXISTS "Public can view members of public leagues (limited)" ON public.league_members;

-- Safe, non-PII roster lookup for public league pages
CREATE OR REPLACE FUNCTION public.get_public_league_member_names(_league_id uuid)
RETURNS TABLE (id uuid, member_name text, handicap_index numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.member_name, m.handicap_index
  FROM public.league_members m
  JOIN public.golf_leagues l ON l.id = m.league_id
  WHERE m.league_id = _league_id
    AND l.is_public = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_league_member_names(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_league_member_names(uuid) TO anon, authenticated;

-- 2) Remove public read of league event registrations (member linkage + fee/payment status)
DROP POLICY IF EXISTS "Public can view registrations of public league events" ON public.league_event_registrations;

-- A member may read only their own registration, proven by their league login code
CREATE OR REPLACE FUNCTION public.get_member_event_registration(_league_slug text, _code text, _event_id uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  member_id uuid,
  team_name text,
  status text,
  registration_fee_paid boolean,
  fee_paid boolean,
  paid_at timestamptz,
  fee_tier_id text,
  fee_tier_label text,
  fee_tier_amount_cents integer,
  tee_time time,
  pairing_group integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.event_id, r.member_id, r.team_name, r.status,
         r.registration_fee_paid, r.fee_paid, r.paid_at,
         r.fee_tier_id, r.fee_tier_label, r.fee_tier_amount_cents,
         r.tee_time, r.pairing_group, r.created_at
  FROM public.league_event_registrations r
  JOIN public.league_members m ON m.id = r.member_id
  JOIN public.golf_leagues l ON l.id = m.league_id
  JOIN public.league_events e ON e.id = r.event_id AND e.league_id = l.id
  WHERE r.event_id = _event_id
    AND upper(coalesce(m.scoring_code, '')) = upper(coalesce(_code, ''))
    AND m.scoring_code IS NOT NULL
    AND (_league_slug IS NULL OR l.league_slug = _league_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_member_event_registration(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_event_registration(text, text, uuid) TO anon, authenticated;