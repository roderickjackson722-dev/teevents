-- College Golf Scoring add-on tracking on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS college_scoring_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS college_scoring_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS college_scoring_divisions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS college_scoring_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS college_scoring_purchased BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS college_scoring_divisions_purchased INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS college_scoring_purchase_date TIMESTAMPTZ;

-- Golf league annual subscription tracking
ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
  ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_reminder_sent_30d BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_reminder_sent_7d BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_reminder_sent_0d BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS events_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events_limit INTEGER DEFAULT 24;

-- Admin pricing overrides for add-ons
CREATE TABLE IF NOT EXISTS public.admin_addon_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_key TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_addon_pricing TO authenticated;
GRANT SELECT ON public.admin_addon_pricing TO anon;
GRANT ALL ON public.admin_addon_pricing TO service_role;
ALTER TABLE public.admin_addon_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read addon pricing"
  ON public.admin_addon_pricing FOR SELECT USING (true);
CREATE POLICY "Admins manage addon pricing"
  ON public.admin_addon_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add-on discount codes
CREATE TABLE IF NOT EXISTS public.addon_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  addon_key TEXT,
  discount_percent INTEGER,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addon_discount_codes TO authenticated;
GRANT ALL ON public.addon_discount_codes TO service_role;
ALTER TABLE public.addon_discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read discount codes"
  ON public.addon_discount_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage discount codes"
  ON public.addon_discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default College Golf Scoring pricing (per number of divisions)
INSERT INTO public.admin_addon_pricing (addon_key, price_cents) VALUES
  ('college_scoring_1', 19900),
  ('college_scoring_2', 37500),
  ('college_scoring_3', 55000),
  ('college_scoring_4', 72000)
ON CONFLICT (addon_key) DO NOTHING;