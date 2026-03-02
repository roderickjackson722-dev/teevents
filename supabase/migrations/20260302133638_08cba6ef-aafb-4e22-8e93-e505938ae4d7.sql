
-- Create tournament_donations table
CREATE TABLE public.tournament_donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  donor_email TEXT,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tournament_donations_tournament_id ON public.tournament_donations(tournament_id);

-- Enable RLS
ALTER TABLE public.tournament_donations ENABLE ROW LEVEL SECURITY;

-- Org members can view donations for their tournaments
CREATE POLICY "Org members can view donations"
  ON public.tournament_donations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_donations.tournament_id
      AND is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Edge function inserts donations (no auth required for public donations)
CREATE POLICY "Anyone can insert donations"
  ON public.tournament_donations
  FOR INSERT
  WITH CHECK (true);

-- Edge function can update donation status
CREATE POLICY "Anyone can update donation status"
  ON public.tournament_donations
  FOR UPDATE
  USING (true);
