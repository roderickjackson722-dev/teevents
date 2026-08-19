DROP FUNCTION IF EXISTS public.get_public_pairings(text);

CREATE OR REPLACE FUNCTION public.get_public_pairings(_slug text)
RETURNS TABLE(
  tournament_id uuid,
  title text,
  event_date date,
  course_name text,
  start_format text,
  page_config jsonb,
  logo_url text,
  hero_image_url text,
  contact_email text,
  group_number integer,
  starting_hole integer,
  tee_time text,
  team_name text,
  flight_name text,
  first_name text,
  last_name text,
  group_position integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (
    SELECT tt.id, tt.title,
           COALESCE(
             NULLIF(tt.pairings_config->'byDay'->'0'->>'roundDate','')::date,
             tt.date
           ) AS date,
           tt.course_name, tt.pairings_start_format,
           tt.pairings_page_config, tt.site_logo_url, tt.site_hero_image_url, tt.contact_email
    FROM tournaments tt
    WHERE (tt.slug = _slug OR tt.custom_slug = _slug)
      AND tt.site_published = true
      AND COALESCE(tt.pairings_public, true) = true
    LIMIT 1
  )
  SELECT
    t.id,
    t.title,
    t.date,
    t.course_name,
    t.pairings_start_format,
    t.pairings_page_config,
    t.site_logo_url,
    t.site_hero_image_url,
    t.contact_email,
    r.group_number,
    g.starting_hole,
    COALESCE(g.tee_time, r.tee_time),
    g.team_name,
    ti.tier_name,
    r.first_name,
    r.last_name,
    r.group_position
  FROM t
  JOIN tournament_registrations r ON r.tournament_id = t.id
  LEFT JOIN registration_groups g
    ON g.tournament_id = t.id AND g.group_number = r.group_number
  LEFT JOIN tournament_tiers ti ON ti.id = r.flight_id
  WHERE r.group_number IS NOT NULL
  ORDER BY r.group_number, r.group_position NULLS LAST, r.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pairings(text) TO anon, authenticated;