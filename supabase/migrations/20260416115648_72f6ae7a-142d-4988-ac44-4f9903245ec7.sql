-- Sponsorship tiers (created by organizer)
CREATE TABLE public.sponsorship_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  benefits TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sponsor registrations (submitted by sponsors)
CREATE TABLE public.sponsor_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.sponsorship_tiers(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website_url TEXT,
  description TEXT,
  logo_url TEXT,
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sponsorship_tiers_tournament ON public.sponsorship_tiers(tournament_id);
CREATE INDEX idx_sponsor_registrations_tournament ON public.sponsor_registrations(tournament_id);
CREATE INDEX idx_sponsor_registrations_tier ON public.sponsor_registrations(tier_id);
CREATE INDEX idx_sponsor_registrations_payment ON public.sponsor_registrations(payment_status);

-- Enable RLS
ALTER TABLE public.sponsorship_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_registrations ENABLE ROW LEVEL SECURITY;

-- Sponsorship Tiers: public can view active tiers
CREATE POLICY "Anyone can view active sponsorship tiers"
  ON public.sponsorship_tiers FOR SELECT
  USING (is_active = true);

-- Sponsorship Tiers: org members can manage
CREATE POLICY "Org members can manage sponsorship tiers"
  ON public.sponsorship_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  );

-- Sponsor Registrations: anyone can insert (public signup)
CREATE POLICY "Anyone can create sponsor registrations"
  ON public.sponsor_registrations FOR INSERT
  WITH CHECK (true);

-- Sponsor Registrations: org members can view
CREATE POLICY "Org members can view sponsor registrations"
  ON public.sponsor_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsor_registrations.tournament_id AND om.user_id = auth.uid()
    )
  );

-- Sponsor Registrations: service role / edge functions can update payment status
CREATE POLICY "Admins can manage sponsor registrations"
  ON public.sponsor_registrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));