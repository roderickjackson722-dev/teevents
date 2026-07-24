
CREATE TABLE public.organizer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  category TEXT NOT NULL DEFAULT 'general',
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organizer_notes_tournament_idx ON public.organizer_notes(tournament_id);
CREATE INDEX organizer_notes_due_date_idx ON public.organizer_notes(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer_notes TO authenticated;
GRANT ALL ON public.organizer_notes TO service_role;

ALTER TABLE public.organizer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage tournament notes"
  ON public.organizer_notes
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = organizer_notes.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = organizer_notes.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

CREATE OR REPLACE FUNCTION public.update_organizer_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizer_notes_updated_at
  BEFORE UPDATE ON public.organizer_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_organizer_notes_updated_at();
