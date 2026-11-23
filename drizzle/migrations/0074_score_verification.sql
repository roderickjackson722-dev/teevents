ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS score_verification text NOT NULL DEFAULT 'off';
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_score_verification_chk CHECK (score_verification IN ('off','standard','strict'));

CREATE TABLE public.score_hole_status (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  hole_number integer NOT NULL,
  subject_key text NOT NULL,
  member_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'entered' CHECK (status IN ('entered','confirmed','disputed')),
  entered_strokes integer,
  marker_strokes integer,
  entered_at timestamptz NOT NULL DEFAULT now(),
  entered_by_user uuid,
  confirmed_at timestamptz,
  confirmed_by_registration uuid,
  organizer_entered boolean NOT NULL DEFAULT false,
  resolution_reason text,
  resolved_at timestamptz,
  PRIMARY KEY (tournament_id, round_number, hole_number, subject_key)
);
CREATE INDEX score_hole_status_members_idx ON public.score_hole_status USING gin (member_ids);

CREATE TABLE public.score_hole_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  hole_number integer NOT NULL,
  subject_key text NOT NULL,
  kind text NOT NULL,
  strokes integer,
  actor_registration_id uuid,
  actor_user_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX score_hole_events_t_idx ON public.score_hole_events (tournament_id, round_number);

CREATE TABLE public.score_markers (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  registration_id uuid NOT NULL,
  marker_registration_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, round_number, registration_id)
);

CREATE TABLE public.score_cards (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  subject_key text NOT NULL,
  member_ids uuid[] NOT NULL,
  player_ok_at timestamptz,
  player_ok_registration uuid,
  attested_at timestamptz,
  attested_by_registration uuid,
  attested_remote boolean NOT NULL DEFAULT false,
  force_attested_by uuid,
  player_state text CHECK (player_state IN ('dq','wd')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, round_number, subject_key)
);

CREATE TABLE public.score_round_status (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  locked_at timestamptz,
  locked_by uuid,
  published_at timestamptz,
  published_by uuid,
  PRIMARY KEY (tournament_id, round_number)
);

GRANT SELECT ON public.score_hole_status, public.score_hole_events, public.score_markers, public.score_cards, public.score_round_status TO authenticated;
GRANT ALL ON public.score_hole_status, public.score_hole_events, public.score_markers, public.score_cards, public.score_round_status TO service_role;
ALTER TABLE public.score_hole_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_hole_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_round_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view hole status" ON public.score_hole_status FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members view hole events" ON public.score_hole_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members view markers" ON public.score_markers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members view cards" ON public.score_cards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members view round status" ON public.score_round_status FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE OR REPLACE FUNCTION public.sv_is_org_member_of(_tournament_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = _tournament_id
    AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin')))
$$;

CREATE OR REPLACE FUNCTION public.sv_mode(_tournament_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(score_verification, 'off') FROM public.tournaments WHERE id = _tournament_id
$$;

-- Locked rounds block player (code-based, signed-out) edits; organizers can still fix.
CREATE OR REPLACE FUNCTION public.sv_block_locked_player_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t uuid; v_rn int;
BEGIN
  IF TG_OP = 'DELETE' THEN v_t := OLD.tournament_id; v_rn := coalesce(OLD.round_number,1);
  ELSE v_t := NEW.tournament_id; v_rn := coalesce(NEW.round_number,1); END IF;
  IF public.sv_mode(v_t) <> 'off'
     AND EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id = v_t AND round_number = v_rn AND locked_at IS NOT NULL)
     AND NOT public.sv_is_org_member_of(v_t) THEN
    RAISE EXCEPTION 'This round is locked by the organizer — scores can no longer be changed.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aa_sv_block_locked BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_scores
  FOR EACH ROW EXECUTE FUNCTION public.sv_block_locked_player_edit();

-- Record entry status whenever a score is written (any writer).
CREATE OR REPLACE FUNCTION public.sv_record_entry(_t uuid, _rn int, _hole int, _key text, _members uuid[], _strokes int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_org boolean := public.sv_is_org_member_of(_t);
BEGIN
  SELECT * INTO v_old FROM public.score_hole_status WHERE tournament_id=_t AND round_number=_rn AND hole_number=_hole AND subject_key=_key;
  IF FOUND AND v_old.entered_strokes IS NOT DISTINCT FROM _strokes THEN RETURN; END IF;
  INSERT INTO public.score_hole_status (tournament_id, round_number, hole_number, subject_key, member_ids, status, entered_strokes, marker_strokes, entered_at, entered_by_user, organizer_entered)
  VALUES (_t, _rn, _hole, _key, _members, 'entered', _strokes, NULL, now(), auth.uid(), v_org)
  ON CONFLICT (tournament_id, round_number, hole_number, subject_key) DO UPDATE
    SET status='entered', entered_strokes=EXCLUDED.entered_strokes, marker_strokes=NULL, member_ids=EXCLUDED.member_ids,
        entered_at=now(), entered_by_user=auth.uid(), confirmed_at=NULL, confirmed_by_registration=NULL,
        organizer_entered=v_org, resolution_reason=NULL, resolved_at=NULL;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, strokes, actor_user_id)
  VALUES (_t, _rn, _hole, _key, CASE WHEN FOUND THEN 'correction' ELSE 'entry' END, _strokes, auth.uid());
  -- A corrected hole means the card must be re-checked.
  UPDATE public.score_cards SET player_ok_at=NULL, player_ok_registration=NULL, attested_at=NULL, attested_by_registration=NULL,
    attested_remote=false, force_attested_by=NULL, updated_at=now()
   WHERE tournament_id=_t AND round_number=_rn AND subject_key=_key AND (player_ok_at IS NOT NULL OR attested_at IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.sv_on_player_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fmt text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.sv_mode(OLD.tournament_id) = 'off' THEN RETURN NULL; END IF;
    DELETE FROM public.score_hole_status WHERE tournament_id=OLD.tournament_id AND round_number=coalesce(OLD.round_number,1)
      AND hole_number=OLD.hole_number AND subject_key=OLD.registration_id::text;
    INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_user_id)
    VALUES (OLD.tournament_id, coalesce(OLD.round_number,1), OLD.hole_number, OLD.registration_id::text, 'cleared', auth.uid());
    RETURN NULL;
  END IF;
  IF public.sv_mode(NEW.tournament_id) = 'off' THEN RETURN NULL; END IF;
  SELECT scoring_format INTO v_fmt FROM public.tournaments WHERE id = NEW.tournament_id;
  IF public.is_team_score_format(v_fmt) THEN RETURN NULL; END IF;
  PERFORM public.sv_record_entry(NEW.tournament_id, coalesce(NEW.round_number,1), NEW.hole_number, NEW.registration_id::text, ARRAY[NEW.registration_id], NEW.strokes);
  RETURN NULL;
END $$;
CREATE TRIGGER zz_sv_player_score AFTER INSERT OR UPDATE OR DELETE ON public.tournament_scores
  FOR EACH ROW EXECUTE FUNCTION public.sv_on_player_score();

CREATE OR REPLACE FUNCTION public.sv_on_team_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.sv_mode(OLD.tournament_id) = 'off' THEN RETURN NULL; END IF;
    DELETE FROM public.score_hole_status WHERE tournament_id=OLD.tournament_id AND round_number=OLD.round_number
      AND hole_number=OLD.hole_number AND subject_key=OLD.team_key;
    RETURN NULL;
  END IF;
  IF public.sv_mode(NEW.tournament_id) = 'off' THEN RETURN NULL; END IF;
  PERFORM public.sv_record_entry(NEW.tournament_id, NEW.round_number, NEW.hole_number, NEW.team_key, NEW.member_ids, NEW.strokes);
  RETURN NULL;
END $$;
CREATE TRIGGER zz_sv_team_score AFTER INSERT OR UPDATE OR DELETE ON public.tournament_team_scores
  FOR EACH ROW EXECUTE FUNCTION public.sv_on_team_score();

-- Is _actor allowed to attest the subject (members)? Never self, never own team; organizer reassignment wins.
CREATE OR REPLACE FUNCTION public.sv_can_mark(_t uuid, _rn int, _members uuid[], _actor uuid, _group_ids uuid[])
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_override uuid;
BEGIN
  IF _actor IS NULL OR NOT (_actor = ANY(_group_ids)) THEN RETURN false; END IF;
  IF _actor = ANY(_members) THEN RETURN false; END IF;
  IF coalesce(public.team_member_ids(_actor), ARRAY[_actor]) && _members
     AND array_length(coalesce(public.team_member_ids(_actor), ARRAY[_actor]),1) > 1
     AND NOT (array_length(_members,1) = 1 AND (SELECT count(*) FROM unnest(_group_ids)) <= coalesce(array_length(public.team_member_ids(_actor),1),1)) THEN
    RETURN false;
  END IF;
  IF array_length(_members,1) = 1 THEN
    SELECT marker_registration_id INTO v_override FROM public.score_markers WHERE tournament_id=_t AND round_number=_rn AND registration_id=_members[1];
    IF v_override IS NOT NULL AND v_override <> _actor THEN RETURN false; END IF;
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.sv_notify(_t uuid, _title text, _msg text, _meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.organizer_notifications (organization_id, tournament_id, type, severity, title, message, link, metadata)
  SELECT t.organization_id, t.id, 'score_dispute', 'warning', _title, _msg, '/dashboard/leaderboard?tournament_id=' || t.id::text, _meta
  FROM public.tournaments t WHERE t.id = _t AND t.organization_id IS NOT NULL
$$;

-- Phone (scoring code) read of verification state for one group.
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
    'teams', coalesce((SELECT jsonb_object_agg(x::text, to_jsonb(coalesce(public.team_member_ids(x), ARRAY[x]))) FROM unnest(ids) x), '{}'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.confirm_hole_score(_tournament_id uuid, _code text, _round_number integer, _group_number integer,
  _hole_number integer, _subject_key text, _actor_registration_id uuid, _agree boolean, _strokes integer DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; rn int := coalesce(_round_number,1); s record; v_new text;
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  IF public.sv_mode(_tournament_id) = 'off' THEN RAISE EXCEPTION 'Score verification is off for this event.'; END IF;
  IF EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id=_tournament_id AND round_number=rn AND locked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This round is locked by the organizer.'; END IF;
  SELECT * INTO s FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND hole_number=_hole_number AND subject_key=_subject_key;
  IF NOT FOUND OR NOT (s.member_ids && ids) THEN RAISE EXCEPTION 'No score has been entered for this hole yet.'; END IF;
  IF NOT public.sv_can_mark(_tournament_id, rn, s.member_ids, _actor_registration_id, ids) THEN
    RAISE EXCEPTION 'You cannot attest this score. Players never attest their own or their own team''s score.'; END IF;
  IF _agree AND (_strokes IS NULL OR _strokes = s.entered_strokes) THEN
    UPDATE public.score_hole_status SET status='confirmed', marker_strokes=s.entered_strokes, confirmed_at=now(), confirmed_by_registration=_actor_registration_id
     WHERE tournament_id=_tournament_id AND round_number=rn AND hole_number=_hole_number AND subject_key=_subject_key;
    v_new := 'confirmed';
  ELSE
    UPDATE public.score_hole_status SET status='disputed', marker_strokes=_strokes, confirmed_at=NULL, confirmed_by_registration=_actor_registration_id
     WHERE tournament_id=_tournament_id AND round_number=rn AND hole_number=_hole_number AND subject_key=_subject_key;
    v_new := 'disputed';
    PERFORM public.sv_notify(_tournament_id, 'Disputed score on Hole ' || _hole_number,
      'A marker disputed a score (entered ' || s.entered_strokes || coalesce(', marker says ' || _strokes, '') || '). Open the dispute queue to resolve it.',
      jsonb_build_object('hole', _hole_number, 'round', rn, 'subject_key', _subject_key));
  END IF;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, strokes, actor_registration_id)
  VALUES (_tournament_id, rn, _hole_number, _subject_key, v_new, coalesce(_strokes, s.entered_strokes), _actor_registration_id);
  RETURN v_new;
END $$;

CREATE OR REPLACE FUNCTION public.sign_score_card(_tournament_id uuid, _code text, _round_number integer, _group_number integer,
  _subject_key text, _actor_registration_id uuid, _step text, _remote boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; rn int := coalesce(_round_number,1); v_members uuid[]; c record;
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  IF public.sv_mode(_tournament_id) = 'off' THEN RAISE EXCEPTION 'Score verification is off for this event.'; END IF;
  IF EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id=_tournament_id AND round_number=rn AND locked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This round is locked by the organizer.'; END IF;
  SELECT member_ids INTO v_members FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key LIMIT 1;
  IF v_members IS NULL OR NOT (v_members && ids) THEN RAISE EXCEPTION 'No scores found for this card.'; END IF;
  IF EXISTS (SELECT 1 FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key AND status='disputed') THEN
    RAISE EXCEPTION 'This card has a disputed hole. The organizer must resolve it first.'; END IF;
  IF _step = 'player' THEN
    IF NOT (_actor_registration_id = ANY(v_members)) THEN RAISE EXCEPTION 'Only the player can confirm their own card.'; END IF;
    INSERT INTO public.score_cards (tournament_id, round_number, subject_key, member_ids, player_ok_at, player_ok_registration)
    VALUES (_tournament_id, rn, _subject_key, v_members, now(), _actor_registration_id)
    ON CONFLICT (tournament_id, round_number, subject_key) DO UPDATE SET player_ok_at=now(), player_ok_registration=EXCLUDED.player_ok_registration, updated_at=now();
  ELSIF _step = 'marker' THEN
    SELECT * INTO c FROM public.score_cards WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key;
    IF c.player_ok_at IS NULL THEN RAISE EXCEPTION 'The player must tap "My card is correct" first.'; END IF;
    IF NOT public.sv_can_mark(_tournament_id, rn, v_members, _actor_registration_id, ids) THEN
      RAISE EXCEPTION 'You cannot attest this card.'; END IF;
    UPDATE public.score_cards SET attested_at=now(), attested_by_registration=_actor_registration_id, attested_remote=coalesce(_remote,false), updated_at=now()
     WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key;
  ELSE RAISE EXCEPTION 'Unknown step'; END IF;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_registration_id, reason)
  VALUES (_tournament_id, rn, 0, _subject_key, 'card_' || _step, _actor_registration_id, CASE WHEN _remote THEN 'remote' END);
END $$;

-- With verification on, the group card can only be submitted once every card is attested.
CREATE OR REPLACE FUNCTION public.submit_group_scorecard(_tournament_id uuid, _code text, _round_number integer DEFAULT 1, _group_number integer DEFAULT NULL::integer)
 RETURNS timestamp with time zone LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ids uuid[]; rn int := COALESCE(_round_number,1); ts timestamptz;
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  IF public.sv_mode(_tournament_id) <> 'off' THEN
    IF EXISTS (SELECT 1 FROM public.score_hole_status s WHERE s.tournament_id=_tournament_id AND s.round_number=rn AND s.member_ids && ids AND s.status='disputed') THEN
      RAISE EXCEPTION 'A disputed hole must be resolved by the organizer before this scorecard can be submitted.'; END IF;
    IF EXISTS (SELECT 1 FROM (SELECT DISTINCT subject_key FROM public.score_hole_status s WHERE s.tournament_id=_tournament_id AND s.round_number=rn AND s.member_ids && ids) k
      WHERE NOT EXISTS (SELECT 1 FROM public.score_cards c WHERE c.tournament_id=_tournament_id AND c.round_number=rn AND c.subject_key=k.subject_key
        AND (c.attested_at IS NOT NULL OR c.force_attested_by IS NOT NULL OR c.player_state IS NOT NULL))) THEN
      RAISE EXCEPTION 'Every card needs "My card is correct" and the marker''s attestation before submitting.'; END IF;
  END IF;
  SELECT submitted_at INTO ts FROM public.scorecard_submissions
   WHERE tournament_id=_tournament_id AND round_number=rn AND registration_ids && ids LIMIT 1;
  IF ts IS NOT NULL THEN RETURN ts; END IF;
  INSERT INTO public.scorecard_submissions(tournament_id, round_number, registration_ids)
  VALUES (_tournament_id, rn, ids) RETURNING submitted_at INTO ts;
  RETURN ts;
END $function$;

-- Organizer actions.
CREATE OR REPLACE FUNCTION public.org_resolve_hole(_tournament_id uuid, _round_number integer, _hole_number integer, _subject_key text, _strokes integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; rn int := coalesce(_round_number,1);
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _strokes IS NULL OR _strokes < 1 OR _strokes > 20 THEN RAISE EXCEPTION 'Enter a score from 1 to 20.'; END IF;
  SELECT * INTO s FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND hole_number=_hole_number AND subject_key=_subject_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hole not found'; END IF;
  IF _strokes IS DISTINCT FROM s.entered_strokes THEN
    INSERT INTO public.tournament_scores (tournament_id, registration_id, hole_number, strokes, round_number)
    VALUES (_tournament_id, s.member_ids[1], _hole_number, _strokes, rn)
    ON CONFLICT (registration_id, round_number, hole_number) DO UPDATE SET strokes = EXCLUDED.strokes;
  END IF;
  UPDATE public.score_hole_status SET status='confirmed', entered_strokes=_strokes, marker_strokes=_strokes, confirmed_at=now(),
    organizer_entered=true, resolution_reason=nullif(btrim(coalesce(_reason,'')),''), resolved_at=now()
   WHERE tournament_id=_tournament_id AND round_number=rn AND hole_number=_hole_number AND subject_key=_subject_key;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, strokes, actor_user_id, reason)
  VALUES (_tournament_id, rn, _hole_number, _subject_key, 'organizer_resolved', _strokes, auth.uid(), _reason);
END $$;

CREATE OR REPLACE FUNCTION public.org_set_marker(_tournament_id uuid, _round_number integer, _registration_id uuid, _marker_registration_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rn int := coalesce(_round_number,1);
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND _registration_id = ANY(member_ids)) THEN
    RAISE EXCEPTION 'Markers can only be changed before the round starts.'; END IF;
  IF _marker_registration_id IS NULL THEN
    DELETE FROM public.score_markers WHERE tournament_id=_tournament_id AND round_number=rn AND registration_id=_registration_id; RETURN;
  END IF;
  IF _marker_registration_id = _registration_id OR _marker_registration_id = ANY(coalesce(public.team_member_ids(_registration_id), ARRAY[_registration_id])) THEN
    RAISE EXCEPTION 'A player cannot mark themselves or a teammate.'; END IF;
  INSERT INTO public.score_markers (tournament_id, round_number, registration_id, marker_registration_id, assigned_by)
  VALUES (_tournament_id, rn, _registration_id, _marker_registration_id, auth.uid())
  ON CONFLICT (tournament_id, round_number, registration_id) DO UPDATE SET marker_registration_id=EXCLUDED.marker_registration_id, assigned_by=auth.uid(), assigned_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.org_card_action(_tournament_id uuid, _round_number integer, _subject_key text, _member_ids uuid[], _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rn int := coalesce(_round_number,1);
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.score_cards (tournament_id, round_number, subject_key, member_ids) VALUES (_tournament_id, rn, _subject_key, _member_ids)
  ON CONFLICT DO NOTHING;
  IF _action = 'force_attest' THEN
    UPDATE public.score_cards SET force_attested_by=auth.uid(), updated_at=now() WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key;
  ELSIF _action IN ('dq','wd') THEN
    UPDATE public.score_cards SET player_state=_action, updated_at=now() WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key;
  ELSIF _action = 'reinstate' THEN
    UPDATE public.score_cards SET player_state=NULL, force_attested_by=NULL, updated_at=now() WHERE tournament_id=_tournament_id AND round_number=rn AND subject_key=_subject_key;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_user_id)
  VALUES (_tournament_id, rn, 0, _subject_key, 'organizer_' || _action, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.org_round_action(_tournament_id uuid, _round_number integer, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rn int := coalesce(_round_number,1);
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.score_round_status (tournament_id, round_number) VALUES (_tournament_id, rn) ON CONFLICT DO NOTHING;
  IF _action = 'lock' THEN
    UPDATE public.score_round_status SET locked_at=now(), locked_by=auth.uid() WHERE tournament_id=_tournament_id AND round_number=rn;
  ELSIF _action = 'publish' THEN
    IF NOT EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id=_tournament_id AND round_number=rn AND locked_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Lock the round before publishing results.'; END IF;
    IF EXISTS (SELECT 1 FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn AND status='disputed') THEN
      RAISE EXCEPTION 'Resolve every disputed hole before publishing.'; END IF;
    UPDATE public.score_round_status SET published_at=now(), published_by=auth.uid() WHERE tournament_id=_tournament_id AND round_number=rn;
  ELSIF _action = 'reopen' THEN
    UPDATE public.score_round_status SET locked_at=NULL, locked_by=NULL, published_at=NULL, published_by=NULL WHERE tournament_id=_tournament_id AND round_number=rn;
    DELETE FROM public.scorecard_submissions WHERE tournament_id=_tournament_id AND round_number=rn;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_user_id)
  VALUES (_tournament_id, rn, 0, '', 'round_' || _action, auth.uid());
END $$;

-- Public labels per player (only for published events with verification on).
CREATE OR REPLACE FUNCTION public.get_public_score_verification(_tournament_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN t.site_published IS NOT TRUE OR coalesce(t.score_verification,'off') = 'off' THEN jsonb_build_object('mode','off')
  ELSE jsonb_build_object(
    'mode', t.score_verification,
    'published_rounds', coalesce((SELECT jsonb_agg(round_number) FROM public.score_round_status WHERE tournament_id=t.id AND published_at IS NOT NULL), '[]'::jsonb),
    'labels', coalesce((SELECT jsonb_object_agg(rid::text, lbl) FROM (
      SELECT m.rid,
        CASE WHEN bool_or(s.status='disputed') THEN 'disputed'
             WHEN bool_and(EXISTS (SELECT 1 FROM public.score_cards c WHERE c.tournament_id=t.id AND c.round_number=s.round_number AND c.subject_key=s.subject_key
               AND ((c.attested_at IS NOT NULL AND NOT c.attested_remote) OR c.force_attested_by IS NOT NULL))) THEN 'attested'
             ELSE 'unverified' END AS lbl
      FROM public.score_hole_status s CROSS JOIN LATERAL unnest(s.member_ids) m(rid)
      WHERE s.tournament_id=t.id GROUP BY m.rid) x), '{}'::jsonb)
  ) END
  FROM public.tournaments t WHERE t.id = _tournament_id
$$;

CREATE OR REPLACE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
 RETURNS TABLE(registration_id uuid, hole_number integer, strokes integer, round_number integer, first_name text, last_name text, group_number integer, team_name text, flight_id uuid, flight_name text, group_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.registration_id, s.hole_number, s.strokes, s.round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name,
         r.flight_id, ft.tier_name AS flight_name, r.group_id
  FROM public.tournament_scores_with_teams s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.tournament_tiers ft ON ft.id = r.flight_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.status, 'active')) <> 'wd'
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'void')
    AND (coalesce(t.score_verification,'off') = 'off' OR NOT EXISTS (
      SELECT 1 FROM public.score_hole_status hs WHERE hs.tournament_id = s.tournament_id AND hs.round_number = s.round_number
        AND hs.hole_number = s.hole_number AND hs.status = 'disputed' AND s.registration_id = ANY(hs.member_ids)))
  ORDER BY r.last_name, r.first_name, s.round_number, s.hole_number, s.registration_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_group_verification(uuid,text,integer,integer), public.confirm_hole_score(uuid,text,integer,integer,integer,text,uuid,boolean,integer),
  public.sign_score_card(uuid,text,integer,integer,text,uuid,text,boolean), public.get_public_score_verification(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_resolve_hole(uuid,integer,integer,text,integer,text), public.org_set_marker(uuid,integer,uuid,uuid),
  public.org_card_action(uuid,integer,text,uuid[],text), public.org_round_action(uuid,integer,text) TO authenticated;