
CREATE OR REPLACE FUNCTION public.get_player_hub_by_token(_token UUID)
RETURNS TABLE (
  registration_id UUID,
  tournament_id UUID,
  first_name TEXT,
  last_name TEXT,
  group_number INT,
  group_position INT,
  scoring_code TEXT,
  tournament_title TEXT,
  tournament_slug TEXT,
  tournament_date DATE,
  course_name TEXT,
  organization_id UUID
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    r.id,
    r.tournament_id,
    r.first_name,
    r.last_name,
    r.group_number,
    r.group_position,
    r.scoring_code,
    t.title,
    t.slug,
    t.date,
    t.course_name,
    t.organization_id
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.qr_token = _token
    AND (r.qr_token_expires_at IS NULL OR r.qr_token_expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_hub_by_token(UUID) TO anon, authenticated;
