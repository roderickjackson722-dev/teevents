
CREATE TABLE public.tournament_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournament_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_tiers TO authenticated;
GRANT ALL ON public.tournament_tiers TO service_role;

ALTER TABLE public.tournament_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tiers for published tournaments"
ON public.tournament_tiers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_tiers.tournament_id
      AND t.site_published = true
  )
);

CREATE POLICY "Org members can view tiers"
ON public.tournament_tiers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_tiers.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id)
           OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Org members can insert tiers"
ON public.tournament_tiers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_tiers.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id)
           OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Org members can update tiers"
ON public.tournament_tiers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_tiers.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id)
           OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Org members can delete tiers"
ON public.tournament_tiers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_tiers.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id)
           OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE TRIGGER trg_tournament_tiers_updated_at
BEFORE UPDATE ON public.tournament_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tournament_tiers_tournament ON public.tournament_tiers(tournament_id, display_order);

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.tournament_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tier ON public.tournament_registrations(tier_id);
