CREATE OR REPLACE FUNCTION public.lookup_scoring_access(_slug text, _code text)
RETURNS TABLE (
  tournament_id uuid,
  route_slug text,
  kind text,
  title text,
  course_par integer,
  hole_pars jsonb,
  live_allow_edit_past_holes boolean,
  live_require_confirm_save boolean,
  live_leaderboard_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT nullif(trim(coalesce(_slug, '')), '') AS slug_value,
           upper(nullif(trim(coalesce(_code, '')), '')) AS code_value
  ), matching AS (
    SELECT
      t.id,
      coalesce(nullif(t.custom_slug, ''), nullif(t.slug, ''), t.id::text) AS route_slug,
      CASE
        WHEN upper(coalesce(r.group_scoring_code, '')) = c.code_value THEN 'group'
        WHEN upper(coalesce(r.scoring_code, '')) = c.code_value THEN 'individual'
        ELSE NULL
      END AS kind,
      t.title,
      t.course_par,
      t.hole_pars,
      coalesce(t.live_allow_edit_past_holes, false) AS live_allow_edit_past_holes,
      coalesce(t.live_require_confirm_save, false) AS live_require_confirm_save,
      coalesce(t.live_leaderboard_enabled, true) AS live_leaderboard_enabled,
      CASE
        WHEN c.slug_value IS NOT NULL
          AND (t.slug = c.slug_value OR t.custom_slug = c.slug_value OR t.id::text = c.slug_value) THEN 0
        ELSE 1
      END AS slug_rank
    FROM cleaned c
    JOIN public.tournament_registrations r
      ON c.code_value IS NOT NULL
     AND (
       upper(coalesce(r.group_scoring_code, '')) = c.code_value
       OR upper(coalesce(r.scoring_code, '')) = c.code_value
     )
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE t.site_published = true
      AND coalesce(t.day_of_page_enabled, true) = true
      AND coalesce(t.day_of_page_mode, 'live') = 'live'
  )
  SELECT DISTINCT ON (m.id, m.kind)
    m.id,
    m.route_slug,
    m.kind,
    m.title,
    m.course_par,
    m.hole_pars,
    m.live_allow_edit_past_holes,
    m.live_require_confirm_save,
    m.live_leaderboard_enabled
  FROM matching m
  WHERE m.kind IS NOT NULL
  ORDER BY m.id, m.kind, m.slug_rank
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_scoring_access(text, text) TO anon, authenticated;

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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.first_name, r.last_name, r.group_position,
         r.playing_handicap, r.course_handicap, r.handicap
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id
    AND r.group_scoring_code IS NOT NULL
    AND upper(r.group_scoring_code) = upper(_code)
    AND t.site_published = true
    AND coalesce(t.day_of_page_enabled, true) = true
    AND coalesce(t.day_of_page_mode, 'live') = 'live'
  ORDER BY r.group_position NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_scoring_roster(uuid, text) TO anon, authenticated;