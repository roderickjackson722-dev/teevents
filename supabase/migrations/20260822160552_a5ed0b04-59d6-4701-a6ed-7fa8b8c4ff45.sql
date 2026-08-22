CREATE OR REPLACE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
 RETURNS TABLE(registration_id uuid, hole_number integer, strokes integer, round_number integer, first_name text, last_name text, group_number integer, team_name text, flight_id uuid, flight_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.registration_id, s.hole_number, s.strokes, COALESCE(s.round_number, 1) AS round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name,
         r.flight_id,
         ft.tier_name AS flight_name
  FROM public.tournament_scores s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.tournament_tiers ft ON ft.id = r.flight_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'void');
$function$;