
-- Part 1: Early registration discount
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS early_registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS early_registration_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS early_registration_expires_at TIMESTAMPTZ;

-- Part 3: Cash registration
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS allow_cash_registration BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS cash_payment_received BOOLEAN NOT NULL DEFAULT FALSE;

-- Part 4: Sponsor logo optional + notes
ALTER TABLE public.sponsorship_tiers
  ADD COLUMN IF NOT EXISTS require_logo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_logo_upload BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_additional_notes BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Part 5: Donations customization
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS donations_header_text TEXT,
  ADD COLUMN IF NOT EXISTS donations_footer_text TEXT,
  ADD COLUMN IF NOT EXISTS fundraising_goal_custom BOOLEAN NOT NULL DEFAULT FALSE;

-- Part 2: Event Day Sales items
CREATE TABLE IF NOT EXISTS public.event_day_sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'custom', -- walkup | mulligan | contest | custom
  max_quantity INTEGER,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  show_on_public BOOLEAN NOT NULL DEFAULT TRUE,
  show_qr_code BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_day_sales_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_day_sales_items TO authenticated;
GRANT ALL ON public.event_day_sales_items TO service_role;

ALTER TABLE public.event_day_sales_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active event day sales items"
  ON public.event_day_sales_items FOR SELECT
  USING (
    is_active = true AND show_on_public = true AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = event_day_sales_items.tournament_id AND t.site_published = true
    )
  );

CREATE POLICY "Org members can view event day sales items"
  ON public.event_day_sales_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = event_day_sales_items.tournament_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can insert event day sales items"
  ON public.event_day_sales_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = event_day_sales_items.tournament_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can update event day sales items"
  ON public.event_day_sales_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = event_day_sales_items.tournament_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Org members can delete event day sales items"
  ON public.event_day_sales_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = event_day_sales_items.tournament_id AND om.user_id = auth.uid()
  ));

CREATE TRIGGER trg_event_day_sales_items_updated_at
  BEFORE UPDATE ON public.event_day_sales_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_event_day_sales_items_tournament ON public.event_day_sales_items(tournament_id);

-- Event Day Sales purchases
CREATE TABLE IF NOT EXISTS public.event_day_sales_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.event_day_sales_items(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  buyer_name TEXT,
  buyer_email TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.event_day_sales_purchases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_day_sales_purchases TO authenticated;
GRANT ALL ON public.event_day_sales_purchases TO service_role;

ALTER TABLE public.event_day_sales_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create purchases"
  ON public.event_day_sales_purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view purchases"
  ON public.event_day_sales_purchases FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = event_day_sales_purchases.tournament_id AND om.user_id = auth.uid()
  ));

-- Part 5: Offline donations table
CREATE TABLE IF NOT EXISTS public.tournament_offline_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  donor_name TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournament_offline_donations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_offline_donations TO authenticated;
GRANT ALL ON public.tournament_offline_donations TO service_role;

ALTER TABLE public.tournament_offline_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view offline donations for published tournaments"
  ON public.tournament_offline_donations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_offline_donations.tournament_id AND t.site_published = true
  ));

CREATE POLICY "Org members can manage offline donations"
  ON public.tournament_offline_donations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = tournament_offline_donations.tournament_id AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members om ON om.organization_id = t.organization_id
    WHERE t.id = tournament_offline_donations.tournament_id AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_tournament_offline_donations_tournament ON public.tournament_offline_donations(tournament_id);
