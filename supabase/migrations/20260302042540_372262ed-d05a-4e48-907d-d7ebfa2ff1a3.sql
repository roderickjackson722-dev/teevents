
-- Promo codes table for admin to create discount codes
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  applicable_plans text[] DEFAULT ARRAY['starter', 'pro'],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage promo codes
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow public read for code validation during checkout (read only active codes by code)
CREATE POLICY "Anyone can validate promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (is_active = true);

-- Demo events table to track admin demo tournaments  
CREATE TABLE public.admin_demo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Demo Event',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_demo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage demo events"
  ON public.admin_demo_events
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
