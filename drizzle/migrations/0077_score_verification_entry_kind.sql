CREATE OR REPLACE FUNCTION public.sv_record_entry(_t uuid, _rn int, _hole int, _key text, _members uuid[], _strokes int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_existed boolean; v_org boolean := public.sv_is_org_member_of(_t);
BEGIN
  SELECT * INTO v_old FROM public.score_hole_status WHERE tournament_id=_t AND round_number=_rn AND hole_number=_hole AND subject_key=_key;
  v_existed := FOUND;
  IF v_existed AND v_old.entered_strokes IS NOT DISTINCT FROM _strokes THEN RETURN; END IF;
  INSERT INTO public.score_hole_status (tournament_id, round_number, hole_number, subject_key, member_ids, status, entered_strokes, marker_strokes, entered_at, entered_by_user, organizer_entered)
  VALUES (_t, _rn, _hole, _key, _members, 'entered', _strokes, NULL, now(), auth.uid(), v_org)
  ON CONFLICT (tournament_id, round_number, hole_number, subject_key) DO UPDATE
    SET status='entered', entered_strokes=EXCLUDED.entered_strokes, marker_strokes=NULL, member_ids=EXCLUDED.member_ids,
        entered_at=now(), entered_by_user=auth.uid(), confirmed_at=NULL, confirmed_by_registration=NULL,
        organizer_entered=v_org, resolution_reason=NULL, resolved_at=NULL;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, strokes, actor_user_id)
  VALUES (_t, _rn, _hole, _key, CASE WHEN v_existed THEN 'correction' ELSE 'entry' END, _strokes, auth.uid());
  UPDATE public.score_cards SET player_ok_at=NULL, player_ok_registration=NULL, attested_at=NULL, attested_by_registration=NULL,
    attested_remote=false, force_attested_by=NULL, updated_at=now()
   WHERE tournament_id=_t AND round_number=_rn AND subject_key=_key AND (player_ok_at IS NOT NULL OR attested_at IS NOT NULL);
END $$;