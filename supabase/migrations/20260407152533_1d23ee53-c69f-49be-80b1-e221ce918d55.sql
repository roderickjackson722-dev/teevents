
CREATE TABLE public.tournament_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  fee_cents INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tournament_contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage contests"
  ON public.tournament_contests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = tournament_contests.tournament_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = tournament_contests.tournament_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active contests"
  ON public.tournament_contests FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view active contests"
  ON public.tournament_contests FOR SELECT
  TO authenticated
  USING (is_active = true);
