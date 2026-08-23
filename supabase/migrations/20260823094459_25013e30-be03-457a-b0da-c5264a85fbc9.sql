DROP FUNCTION IF EXISTS public.get_public_pairings(text);

CREATE FUNCTION public.get_public_pairings(_slug text)
RETURNS TABLE(
  tournament_id uuid,
  title text,
  event_date date,
  course_name text,
  start_format text,
  page_config jsonb,
  pairings_config jsonb,
  logo_url text,
  hero_image_url text,
  contact_email text,
  active_round integer,
  registration_id uuid,
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
    SELECT tt.id, tt.title, tt.date, tt.course_name, tt.pairings_start_format,
           tt.pairings_page_config, tt.pairings_config, tt.site_logo_url,
           tt.site_hero_image_url, tt.contact_email,
           GREATEST(1, COALESCE((tt.pairings_config ->> 'rounds')::integer, 1)) AS round_count
    FROM public.tournaments tt
    WHERE (tt.slug = _slug OR tt.custom_slug = _slug)
      AND tt.site_published = true
      AND COALESCE(tt.pairings_public, true) = true
    LIMIT 1
  ), active AS (
    SELECT t.*,
           COALESCE(
             (
               SELECT gs
               FROM generate_series(1, t.round_count) gs
               WHERE NOT public.is_tournament_round_closed(t.id, gs)
               ORDER BY gs
               LIMIT 1
             ),
             t.round_count
           ) AS round_number
    FROM t
  ), configured AS (
    SELECT active.*,
           active.pairings_config -> 'assignmentsByDay' -> ((active.round_number - 1)::text) AS assignments,
           COALESCE(
             active.pairings_config -> 'byDay' -> ((active.round_number - 1)::text) ->> 'startFormat',
             CASE WHEN active.round_number = 1 THEN active.pairings_start_format END,
             'tee_times'
           ) AS round_start_format
    FROM active
  )
  SELECT
    c.id,
    c.title,
    COALESCE(
      NULLIF(c.pairings_config -> 'byDay' -> ((c.round_number - 1)::text) ->> 'roundDate', '')::date,
      c.date
    ),
    c.course_name,
    c.round_start_format,
    c.pairings_page_config,
    c.pairings_config,
    c.site_logo_url,
    c.site_hero_image_url,
    c.contact_email,
    c.round_number,
    r.id,
    COALESCE((c.assignments -> r.id::text ->> 'g')::integer, r.group_number),
    COALESCE(
      NULLIF(regexp_replace(c.pairings_config -> 'labels' ->> COALESCE(c.assignments -> r.id::text ->> 'g', r.group_number::text), '[^0-9].*$', ''), '')::integer,
      CASE
        WHEN c.round_start_format = 'tee_times' THEN COALESCE((c.pairings_config -> 'byDay' -> ((c.round_number - 1)::text) ->> 'firstTeeHole')::integer, 1)
        ELSE g.starting_hole
      END,
      r.starting_hole
    ),
    CASE
      WHEN c.round_start_format = 'shotgun' THEN NULL
      ELSE COALESCE(
        c.pairings_config -> 'teeTimesByDay' -> ((c.round_number - 1)::text) ->> COALESCE(c.assignments -> r.id::text ->> 'g', r.group_number::text),
        g.tee_time::text,
        r.tee_time::text
      )
    END,
    g.team_name,
    ti.tier_name,
    r.first_name,
    r.last_name,
    COALESCE((c.assignments -> r.id::text ->> 'p')::integer, r.group_position)
  FROM configured c
  JOIN public.tournament_registrations r ON r.tournament_id = c.id
  LEFT JOIN public.registration_groups g
    ON g.tournament_id = c.id
   AND g.group_number = COALESCE((c.assignments -> r.id::text ->> 'g')::integer, r.group_number)
  LEFT JOIN public.tournament_tiers ti ON ti.id = r.flight_id
  WHERE COALESCE((c.assignments -> r.id::text ->> 'g')::integer, r.group_number) IS NOT NULL
  ORDER BY 13, 20 NULLS LAST, r.last_name;
$$;

REVOKE ALL ON FUNCTION public.get_public_pairings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pairings(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.scoring_code_group_ids(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scoring_code_group_ids(uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_round_scoring_group(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_scoring_group(uuid, text, integer) TO anon, authenticated;