-- Smart auto-detection for setup checklist
CREATE OR REPLACE FUNCTION public.recompute_tournament_setup_progress(_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  org RECORD;
  has_payout boolean;
  has_players boolean;
  has_sponsors boolean;
  has_pairings boolean;
  has_volunteers boolean;
  is_pro_or_paid boolean;
BEGIN
  SELECT * INTO t FROM public.tournaments WHERE id = _tournament_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO org FROM public.organizations WHERE id = t.organization_id;

  -- Ensure progress rows exist
  INSERT INTO public.tournament_setup_progress (tournament_id, task_id, status)
  SELECT _tournament_id, s.id, 'not_started'
  FROM public.setup_checklist_tasks s
  ON CONFLICT (tournament_id, task_id) DO NOTHING;

  -- Helper booleans
  SELECT EXISTS (SELECT 1 FROM public.organization_payout_methods WHERE organization_id = t.organization_id) INTO has_payout;
  SELECT EXISTS (SELECT 1 FROM public.tournament_registrations WHERE tournament_id = _tournament_id) INTO has_players;
  SELECT EXISTS (SELECT 1 FROM public.sponsorship_tiers WHERE tournament_id = _tournament_id) INTO has_sponsors;
  -- Pairings: registrations with a hole_assignment or tee_time set
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = _tournament_id
      AND (
        (jsonb_typeof(to_jsonb(tournament_registrations) -> 'hole_assignment') = 'number') OR
        (jsonb_typeof(to_jsonb(tournament_registrations) -> 'tee_time') = 'string')
      )
  ) INTO has_pairings;
  SELECT EXISTS (SELECT 1 FROM public.tournament_volunteers WHERE tournament_id = _tournament_id) INTO has_volunteers;

  is_pro_or_paid := COALESCE(t.is_pro, false);

  -- Mark tasks completed when condition is true and not already completed
  UPDATE public.tournament_setup_progress p
  SET status = 'completed', completed_at = COALESCE(p.completed_at, now())
  FROM public.setup_checklist_tasks s
  WHERE p.task_id = s.id
    AND p.tournament_id = _tournament_id
    AND p.status <> 'completed'
    AND (
      (s.task_key = 'create_organization' AND org.id IS NOT NULL) OR
      (s.task_key = 'choose_plan' AND is_pro_or_paid) OR
      (s.task_key = 'payout_method' AND has_payout) OR
      (s.task_key = 'create_tournament' AND t.id IS NOT NULL) OR
      (s.task_key = 'add_course_details' AND t.course_name IS NOT NULL AND length(trim(t.course_name)) > 0) OR
      (s.task_key = 'choose_scoring_format' AND t.scoring_format IS NOT NULL) OR
      (s.task_key = 'set_registration_pricing' AND t.registration_fee_cents IS NOT NULL AND t.registration_fee_cents >= 0 AND t.registration_open = true) OR
      (s.task_key = 'customize_public_site' AND t.site_published = true) OR
      (s.task_key = 'enable_public_listing' AND COALESCE(t.show_in_public_search, false) = true) OR
      (s.task_key = 'share_link_qr' AND t.slug IS NOT NULL) OR
      (s.task_key = 'create_sponsor_tiers' AND has_sponsors) OR
      (s.task_key = 'add_first_player' AND has_players) OR
      (s.task_key = 'create_pairings' AND has_pairings) OR
      (s.task_key = 'assign_volunteers' AND has_volunteers)
    );
END;
$$;

-- Backfill: recompute for every tournament
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tournaments LOOP
    PERFORM public.recompute_tournament_setup_progress(r.id);
  END LOOP;
END $$;

-- Grant execute to authenticated so the edge function and clients can trigger recompute
GRANT EXECUTE ON FUNCTION public.recompute_tournament_setup_progress(uuid) TO authenticated, anon;