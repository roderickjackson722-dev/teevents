
-- Add test mode flag to tournaments
ALTER TABLE public.tournaments ADD COLUMN test_mode_enabled BOOLEAN DEFAULT false;

-- Test participants (mock golfers)
CREATE TABLE public.test_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handicap_index DECIMAL(4,1),
  course_handicap INTEGER,
  playing_handicap INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage test participants"
ON public.test_participants FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = test_participants.tournament_id
  AND public.is_org_member(auth.uid(), t.organization_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = test_participants.tournament_id
  AND public.is_org_member(auth.uid(), t.organization_id)
));

CREATE POLICY "Admins can manage all test participants"
ON public.test_participants FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Test scores
CREATE TABLE public.test_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  test_participant_id UUID NOT NULL REFERENCES public.test_participants(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  gross_score INTEGER,
  net_score INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (test_participant_id, hole_number)
);

ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage test scores"
ON public.test_scores FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = test_scores.tournament_id
  AND public.is_org_member(auth.uid(), t.organization_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = test_scores.tournament_id
  AND public.is_org_member(auth.uid(), t.organization_id)
));

CREATE POLICY "Admins can manage all test scores"
ON public.test_scores FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_test_participants_tournament ON public.test_participants(tournament_id);
CREATE INDEX idx_test_scores_tournament ON public.test_scores(tournament_id);
CREATE INDEX idx_test_scores_participant ON public.test_scores(test_participant_id);
