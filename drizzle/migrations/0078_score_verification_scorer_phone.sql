CREATE TABLE public.score_group_scorers (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  group_key text NOT NULL,
  device_token text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, round_number, group_key)
);
GRANT SELECT ON public.score_group_scorers TO authenticated;
GRANT ALL ON public.score_group_scorers TO service_role;
ALTER TABLE public.score_group_scorers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view scorers" ON public.score_group_scorers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE OR REPLACE FUNCTION public.sv_group_key(_ids uuid[])
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT array_to_string(ARRAY(SELECT x::text FROM unnest(_ids) x ORDER BY 1), ',') $$;

CREATE OR REPLACE FUNCTION public.claim_group_scorer(_tournament_id uuid, _code text, _round_number integer, _group_number integer, _device_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; rn int := coalesce(_round_number,1); k text; cur text;
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  IF public.sv_mode(_tournament_id) = 'off' THEN RETURN true; END IF;
  IF _device_token IS NULL OR length(_device_token) < 16 THEN RETURN false; END IF;
  k := public.sv_group_key(ids);
  INSERT INTO public.score_group_scorers (tournament_id, round_number, group_key, device_token)
  VALUES (_tournament_id, rn, k, _device_token) ON CONFLICT DO NOTHING;
  SELECT device_token INTO cur FROM public.score_group_scorers WHERE tournament_id=_tournament_id AND round_number=rn AND group_key=k;
  RETURN cur = _device_token;
END $$;

CREATE OR REPLACE FUNCTION public.sv_require_scorer(_tournament_id uuid, _code text, _round_number integer, _group_number integer, _device_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.sv_mode(_tournament_id) <> 'off' AND NOT public.claim_group_scorer(_tournament_id, _code, _round_number, _group_number, _device_token) THEN
    RAISE EXCEPTION 'View only — another phone is this group''s scorer. Ask the organizer to switch the scorer phone.';
  END IF;
  PERFORM set_config('tv.scorer_ok', '1', true);
END $$;

CREATE OR REPLACE FUNCTION public.save_group_scores_as_scorer(_tournament_id uuid, _code text, _scores jsonb, _device_token text, _round_number integer DEFAULT 1, _group_number integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sv_require_scorer(_tournament_id, _code, _round_number, _group_number, _device_token);
  PERFORM public.save_group_scores(_tournament_id, _code, _scores, _group_number);
  PERFORM set_config('tv.scorer_ok', '', true);
END $$;

CREATE OR REPLACE FUNCTION public.clear_group_hole_scores_as_scorer(_tournament_id uuid, _code text, _hole_number integer, _device_token text, _round_number integer DEFAULT 1, _registration_id uuid DEFAULT NULL, _group_number integer DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  PERFORM public.sv_require_scorer(_tournament_id, _code, _round_number, _group_number, _device_token);
  n := public.clear_group_hole_scores(_tournament_id, _code, _hole_number, _round_number, _registration_id, _group_number);
  PERFORM set_config('tv.scorer_ok', '', true);
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.org_reset_scorer(_tournament_id uuid, _round_number integer, _group_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.sv_is_org_member_of(_tournament_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  DELETE FROM public.score_group_scorers WHERE tournament_id=_tournament_id AND round_number=coalesce(_round_number,1) AND group_key=_group_key;
END $$;

CREATE OR REPLACE FUNCTION public.sv_block_locked_player_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t uuid; v_rn int;
BEGIN
  IF TG_OP = 'DELETE' THEN v_t := OLD.tournament_id; v_rn := coalesce(OLD.round_number,1);
  ELSE v_t := NEW.tournament_id; v_rn := coalesce(NEW.round_number,1); END IF;
  IF public.sv_mode(v_t) <> 'off' AND NOT public.sv_is_org_member_of(v_t) THEN
    IF EXISTS (SELECT 1 FROM public.score_round_status WHERE tournament_id = v_t AND round_number = v_rn AND locked_at IS NOT NULL) THEN
      RAISE EXCEPTION 'This round is locked by the organizer — scores can no longer be changed.';
    END IF;
    IF coalesce(current_setting('tv.scorer_ok', true), '') <> '1' THEN
      RAISE EXCEPTION 'Score verification is On: scores can only be entered from the group''s scorer phone.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
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
    IF EXISTS (SELECT 1 FROM (SELECT DISTINCT subject_key FROM public.score_hole_status WHERE tournament_id=_tournament_id AND round_number=rn) k
      WHERE NOT EXISTS (SELECT 1 FROM public.score_cards c WHERE c.tournament_id=_tournament_id AND c.round_number=rn AND c.subject_key=k.subject_key
        AND (c.attested_at IS NOT NULL OR c.force_attested_by IS NOT NULL OR c.player_state IS NOT NULL))) THEN
      RAISE EXCEPTION 'Some cards are still unsubmitted. Force-attest, withdraw or disqualify them before publishing.'; END IF;
    UPDATE public.score_round_status SET published_at=now(), published_by=auth.uid() WHERE tournament_id=_tournament_id AND round_number=rn;
  ELSIF _action = 'reopen' THEN
    UPDATE public.score_round_status SET locked_at=NULL, locked_by=NULL, published_at=NULL, published_by=NULL WHERE tournament_id=_tournament_id AND round_number=rn;
    DELETE FROM public.scorecard_submissions WHERE tournament_id=_tournament_id AND round_number=rn;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO public.score_hole_events (tournament_id, round_number, hole_number, subject_key, kind, actor_user_id)
  VALUES (_tournament_id, rn, 0, '', 'round_' || _action, auth.uid());
END $$;

GRANT EXECUTE ON FUNCTION public.claim_group_scorer(uuid,text,integer,integer,text),
  public.save_group_scores_as_scorer(uuid,text,jsonb,text,integer,integer),
  public.clear_group_hole_scores_as_scorer(uuid,text,integer,text,integer,uuid,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_reset_scorer(uuid,integer,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sv_require_scorer(uuid,text,integer,integer,text) FROM anon, authenticated, public;