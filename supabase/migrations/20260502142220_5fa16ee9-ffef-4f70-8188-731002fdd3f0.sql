
-- Team promoters
CREATE TABLE public.team_promoters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  unique_ref_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_promoters_tournament ON public.team_promoters(tournament_id);
CREATE INDEX idx_team_promoters_ref_code ON public.team_promoters(unique_ref_code);

ALTER TABLE public.team_promoters ENABLE ROW LEVEL SECURITY;

-- Org members can manage promoters for their tournaments
CREATE POLICY "Org members manage team_promoters"
ON public.team_promoters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = team_promoters.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = team_promoters.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

-- Public can read active promoters (needed for attribution lookup on public page)
CREATE POLICY "Public can read active promoters by code"
ON public.team_promoters FOR SELECT
USING (is_active = true);

CREATE TRIGGER update_team_promoters_updated_at
BEFORE UPDATE ON public.team_promoters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referral clicks
CREATE TABLE public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.team_promoters(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_clicks_promoter ON public.referral_clicks(promoter_id);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert click logs (anonymous tracking)
CREATE POLICY "Anyone can log clicks"
ON public.referral_clicks FOR INSERT
WITH CHECK (true);

-- Only org members can read clicks
CREATE POLICY "Org members read referral_clicks"
ON public.referral_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_promoters p
    JOIN public.tournaments t ON t.id = p.tournament_id
    WHERE p.id = referral_clicks.promoter_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

-- Add columns to tournament_registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS promoter_id UUID REFERENCES public.team_promoters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code_used TEXT;
CREATE INDEX IF NOT EXISTS idx_registrations_promoter ON public.tournament_registrations(promoter_id);

-- Promoter incentives
CREATE TABLE public.promoter_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  threshold_registrations INTEGER,
  threshold_revenue_cents INTEGER,
  threshold_rank INTEGER,
  reward_type TEXT,
  reward_value TEXT,
  awarded_to UUID REFERENCES public.team_promoters(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promoter_incentives_tournament ON public.promoter_incentives(tournament_id);

ALTER TABLE public.promoter_incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage promoter_incentives"
ON public.promoter_incentives FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = promoter_incentives.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = promoter_incentives.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE TRIGGER update_promoter_incentives_updated_at
BEFORE UPDATE ON public.promoter_incentives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate ref code if missing
CREATE OR REPLACE FUNCTION public.generate_promoter_ref_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.unique_ref_code IS NULL OR NEW.unique_ref_code = '' THEN
    base_code := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_code := trim(both '-' from base_code);
    IF base_code = '' THEN base_code := 'ref'; END IF;
    final_code := base_code || '-' || substr(md5(random()::text), 1, 4);
    WHILE EXISTS (SELECT 1 FROM public.team_promoters WHERE unique_ref_code = final_code) LOOP
      counter := counter + 1;
      final_code := base_code || '-' || substr(md5(random()::text || counter::text), 1, 4);
    END LOOP;
    NEW.unique_ref_code := final_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_promoters_set_ref_code
BEFORE INSERT ON public.team_promoters
FOR EACH ROW EXECUTE FUNCTION public.generate_promoter_ref_code();
