CREATE OR REPLACE FUNCTION public.sv_can_mark(_t uuid, _rn int, _members uuid[], _actor uuid, _group_ids uuid[])
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_override uuid; v_actor_group uuid;
BEGIN
  IF _actor IS NULL OR NOT (_actor = ANY(_group_ids)) THEN RETURN false; END IF;
  IF _actor = ANY(_members) THEN RETURN false; END IF;
  SELECT group_id INTO v_actor_group FROM public.tournament_registrations WHERE id = _actor;
  IF v_actor_group IS NOT NULL AND EXISTS (SELECT 1 FROM public.tournament_registrations r WHERE r.id = ANY(_members) AND r.group_id = v_actor_group) THEN
    RETURN false;
  END IF;
  IF array_length(_members,1) = 1 THEN
    SELECT marker_registration_id INTO v_override FROM public.score_markers WHERE tournament_id=_t AND round_number=_rn AND registration_id=_members[1];
    IF v_override IS NOT NULL AND v_override <> _actor THEN RETURN false; END IF;
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.org_set_marker(_tournament_id uuid, _round_number integer, _registration_id uuid, _marker_registration_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rn int := coalesce(_round_number,1); g1 uuid; g2 uuid;
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND _registration_id = ANY(member_ids)) THEN
    RAISE EXCEPTION 'Markers can only be changed before the round starts.'; END IF;
  IF _marker_registration_id IS NULL THEN
    DELETE FROM public.score_markers WHERE tournament_id=_tournament_id AND round_number=rn AND registration_id=_registration_id; RETURN;
  END IF;
  SELECT group_id INTO g1 FROM public.tournament_registrations WHERE id=_registration_id;
  SELECT group_id INTO g2 FROM public.tournament_registrations WHERE id=_marker_registration_id;
  IF _marker_registration_id = _registration_id OR (g1 IS NOT NULL AND g1 = g2) THEN
    RAISE EXCEPTION 'A player cannot mark themselves or a teammate.'; END IF;
  INSERT INTO public.score_markers (tournament_id, round_number, registration_id, marker_registration_id, assigned_by)
  VALUES (_tournament_id, rn, _registration_id, _marker_registration_id, auth.uid())
  ON CONFLICT (tournament_id, round_number, registration_id) DO UPDATE SET marker_registration_id=EXCLUDED.marker_registration_id, assigned_by=auth.uid(), assigned_at=now();
END $$;