DO $mig$
DECLARE f record; def text;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('get_day_of_player','get_live_scoring_group','get_round_group_by_number','get_round_scoring_group','scoring_admin_scores')
  LOOP
    def := pg_get_functiondef(f.oid);
    def := replace(def, 'FROM public.tournament_scores s', 'FROM public.tournament_scores_with_teams s');
    EXECUTE def;
  END LOOP;
  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'scoring_admin_save_round';
  def := replace(def,
    'AND COALESCE(round_number, 1) = _round_number AND hole_number = hole::INTEGER;',
    'AND COALESCE(round_number, 1) = _round_number AND hole_number = hole::INTEGER;
      DELETE FROM public.tournament_team_scores
       WHERE tournament_id = _tournament_id AND _registration_id = ANY(member_ids)
         AND round_number = _round_number AND hole_number = hole::INTEGER;');
  EXECUTE def;
END $mig$;