CREATE OR REPLACE FUNCTION public.get_group_verification(_tournament_id uuid, _code text, _round_number integer DEFAULT 1, _group_number integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; rn int := coalesce(_round_number,1);
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  RETURN jsonb_build_object(
    'mode', public.sv_mode(_tournament_id),
    'locked', EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id=_tournament_id AND round_number=rn AND locked_at IS NOT NULL),
    'published', EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id=_tournament_id AND round_number=rn AND published_at IS NOT NULL),
    'statuses', coalesce((SELECT jsonb_agg(jsonb_build_object('hole', s.hole_number, 'subject_key', s.subject_key, 'member_ids', to_jsonb(s.member_ids),
        'status', s.status, 'entered', s.entered_strokes, 'marker', s.marker_strokes, 'organizer_entered', s.organizer_entered,
        'resolution_reason', s.resolution_reason, 'resolved_at', s.resolved_at))
      FROM public.score_hole_status s WHERE s.tournament_id=_tournament_id AND s.round_number=rn AND s.member_ids && ids), '[]'::jsonb),
    'cards', coalesce((SELECT jsonb_agg(to_jsonb(c) - 'tournament_id') FROM public.score_cards c
      WHERE c.tournament_id=_tournament_id AND c.round_number=rn AND c.member_ids && ids), '[]'::jsonb),
    'markers', coalesce((SELECT jsonb_agg(jsonb_build_object('registration_id', m.registration_id, 'marker_registration_id', m.marker_registration_id))
      FROM public.score_markers m WHERE m.tournament_id=_tournament_id AND m.round_number=rn AND m.registration_id = ANY(ids)), '[]'::jsonb),
    'team_of', coalesce((SELECT jsonb_object_agg(r.id::text, r.group_id) FROM public.tournament_registrations r WHERE r.id = ANY(ids)), '{}'::jsonb)
  );
END $$;