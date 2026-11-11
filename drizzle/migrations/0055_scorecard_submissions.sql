CREATE TABLE public.scorecard_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number int NOT NULL DEFAULT 1,
  registration_ids uuid[] NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  admin_edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scorecard_submissions_t_idx ON public.scorecard_submissions(tournament_id, round_number);
GRANT SELECT ON public.scorecard_submissions TO authenticated;
GRANT ALL ON public.scorecard_submissions TO service_role;
ALTER TABLE public.scorecard_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers and admins view scorecard submissions" ON public.scorecard_submissions
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = scorecard_submissions.tournament_id AND public.is_org_member(auth.uid(), t.organization_id))
);

CREATE OR REPLACE FUNCTION public.can_staff_edit_scores(_tournament_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.id = _tournament_id AND public.is_org_member(auth.uid(), t.organization_id)))
$$;

-- Lock submitted scorecards for players; staff edits stamp "Edited by admin".
CREATE OR REPLACE FUNCTION public.guard_submitted_scorecard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; sub_id uuid;
BEGIN
  r := COALESCE(NEW, OLD);
  SELECT s.id INTO sub_id FROM public.scorecard_submissions s
   WHERE s.tournament_id = r.tournament_id AND s.round_number = COALESCE(r.round_number,1)
     AND r.registration_id = ANY(s.registration_ids) LIMIT 1;
  IF sub_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT public.can_staff_edit_scores(r.tournament_id) THEN
    RAISE EXCEPTION 'This scorecard was submitted and can no longer be edited.';
  END IF;
  IF TG_OP <> 'UPDATE' OR NEW.strokes IS DISTINCT FROM OLD.strokes THEN
    UPDATE public.scorecard_submissions SET admin_edited_at = now() WHERE id = sub_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER guard_submitted_scorecard BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_scores
FOR EACH ROW EXECUTE FUNCTION public.guard_submitted_scorecard();

CREATE OR REPLACE FUNCTION public.submit_group_scorecard(_tournament_id uuid, _code text, _round_number int DEFAULT 1, _group_number int DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; rn int := COALESCE(_round_number,1); ts timestamptz;
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF ids IS NULL THEN RAISE EXCEPTION 'Invalid scoring code'; END IF;
  SELECT submitted_at INTO ts FROM public.scorecard_submissions
   WHERE tournament_id=_tournament_id AND round_number=rn AND registration_ids && ids LIMIT 1;
  IF ts IS NOT NULL THEN RETURN ts; END IF;
  INSERT INTO public.scorecard_submissions(tournament_id, round_number, registration_ids)
  VALUES (_tournament_id, rn, ids) RETURNING submitted_at INTO ts;
  RETURN ts;
END $$;

CREATE OR REPLACE FUNCTION public.get_group_scorecard_submission(_tournament_id uuid, _code text, _round_number int DEFAULT 1, _group_number int DEFAULT NULL)
RETURNS TABLE(submitted_at timestamptz, admin_edited_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
  ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, COALESCE(_round_number,1), _group_number);
  IF ids IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT s.submitted_at, s.admin_edited_at FROM public.scorecard_submissions s
   WHERE s.tournament_id=_tournament_id AND s.round_number=COALESCE(_round_number,1) AND s.registration_ids && ids LIMIT 1;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_group_scorecard(uuid,text,int,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_scorecard_submission(uuid,text,int,int) TO anon, authenticated;