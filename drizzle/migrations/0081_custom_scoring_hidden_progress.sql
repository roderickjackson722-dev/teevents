CREATE OR REPLACE FUNCTION public.get_public_hidden_progress(_tournament_id uuid)
RETURNS TABLE(registration_id uuid, round_number integer, hole_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT s.registration_id, s.round_number, s.hole_number
  FROM public.tournament_scores_with_teams s
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id AND t.site_published = true AND t.custom_scoring IS NOT NULL
    AND public.hole_hidden(s.tournament_id, s.round_number, s.hole_number)
$$;
GRANT EXECUTE ON FUNCTION public.get_public_hidden_progress(uuid) TO anon, authenticated;