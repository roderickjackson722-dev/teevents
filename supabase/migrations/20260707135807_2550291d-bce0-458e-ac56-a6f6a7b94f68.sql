
-- Score edits audit log
CREATE TABLE IF NOT EXISTS public.score_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_type TEXT NOT NULL DEFAULT 'organizer',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.score_edits TO authenticated;
GRANT ALL ON public.score_edits TO service_role;

ALTER TABLE public.score_edits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS score_edits_tournament_idx ON public.score_edits(tournament_id, created_at DESC);

CREATE POLICY "Org members and admins can view score edits"
  ON public.score_edits FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = score_edits.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "Org members and admins can insert score edits"
  ON public.score_edits FOR INSERT
  TO authenticated
  WITH CHECK (
    edited_by = auth.uid() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = score_edits.tournament_id
          AND public.is_org_member(auth.uid(), t.organization_id)
      )
    )
  );
