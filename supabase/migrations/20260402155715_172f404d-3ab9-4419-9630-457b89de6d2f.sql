
-- Sponsor assets table for managing logos, hole signs, digital ads etc.
CREATE TABLE public.sponsor_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.tournament_sponsors(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'logo',
  asset_url TEXT NOT NULL,
  file_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_assets ENABLE ROW LEVEL SECURITY;

-- Admins can manage all sponsor assets
CREATE POLICY "Admins can manage sponsor assets" ON public.sponsor_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Org members can manage their sponsor assets
CREATE POLICY "Org members can manage sponsor assets" ON public.sponsor_assets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = sponsor_assets.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = sponsor_assets.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

-- Add checked_in column to tournament_volunteers if not exists
ALTER TABLE public.tournament_volunteers ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_volunteers ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
