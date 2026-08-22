DROP FUNCTION IF EXISTS public.get_public_team_roster(uuid);

CREATE OR REPLACE FUNCTION public.get_public_team_roster(_tournament_id uuid)
RETURNS TABLE(
  registration_id uuid,
  first_name text,
  last_name text,
  group_number integer,
  group_position integer,
  team_name text,
  tee_time text,
  scoring_code text,
  division text,
  hometown text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    r.id,
    r.first_name,
    r.last_name,
    r.group_number,
    r.group_position,
    COALESCE(
      NULLIF(btrim(rgn.team_name), ''),
      NULLIF(btrim(rgn.group_name), ''),
      NULLIF(btrim(rg.team_name), ''),
      NULLIF(btrim(rg.group_name), ''),
      NULLIF(btrim(r.group_label), '')
    ) AS team_name,
    COALESCE(
      NULLIF(btrim(r.tee_time::text), ''),
      NULLIF(btrim(rgn.tee_time::text), ''),
      NULLIF(btrim(rg.tee_time::text), '')
    ) AS tee_time,
    COALESCE(NULLIF(btrim(r.group_scoring_code), ''), NULLIF(btrim(r.scoring_code), '')) AS scoring_code,
    COALESCE(
      NULLIF(btrim(prt.name), ''),
      NULLIF(btrim(tt.tier_name), ''),
      answers.division
    ) AS division,
    answers.hometown
  FROM public.tournament_registrations r
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.registration_groups rgn
    ON rgn.tournament_id = r.tournament_id
   AND rgn.group_number IS NOT NULL
   AND rgn.group_number = r.group_number
  LEFT JOIN public.tournament_registration_tiers prt ON prt.id = r.tier_id
  LEFT JOIN public.tournament_tiers tt ON tt.id = r.flight_id
  LEFT JOIN LATERAL (
    SELECT
      NULLIF(btrim(string_agg(DISTINCT answer_value, ', ') FILTER (
        WHERE answer_value <> ''
          AND lower(answer_label) ~ '(hometown|home town|city|state|location|region|residence|travel|traveled|travelled|distance|country|from)'
      )), '') AS hometown,
      NULLIF(btrim(string_agg(DISTINCT answer_value, ', ') FILTER (
        WHERE answer_value <> ''
          AND lower(answer_label) ~ '(division|flight|tier)'
      )), '') AS division
    FROM (
      SELECT
        COALESCE(item->>'label', item->>'key', item->>'field_id', '') AS answer_label,
        btrim(COALESCE(item->>'answer', item->>'value', '')) AS answer_value
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(r.custom_answers) = 'array' THEN r.custom_answers ELSE '[]'::jsonb END
      ) AS item
      UNION ALL
      SELECT key AS answer_label, btrim(value #>> '{}') AS answer_value
      FROM jsonb_each(
        CASE WHEN jsonb_typeof(r.custom_answers) = 'object' THEN r.custom_answers ELSE '{}'::jsonb END
      )
      WHERE jsonb_typeof(value) IN ('string', 'number', 'boolean')
    ) normalized_answers
  ) answers ON true
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'abandoned');
$function$;

REVOKE ALL ON FUNCTION public.get_public_team_roster(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_team_roster(uuid) TO anon, authenticated, service_role;