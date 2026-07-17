
-- 1) golf_leagues access columns
ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS access_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_amount_cents integer;

-- 2) league_access_promo_codes (admin managed)
CREATE TABLE IF NOT EXISTS public.league_access_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value >= 0),
  max_uses integer,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_access_promo_codes TO authenticated;
GRANT ALL ON public.league_access_promo_codes TO service_role;
ALTER TABLE public.league_access_promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage league promo codes"
  ON public.league_access_promo_codes FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_lpc_updated BEFORE UPDATE ON public.league_access_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) league_access_purchases
CREATE TABLE IF NOT EXISTS public.league_access_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.golf_leagues(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  discount_cents integer NOT NULL DEFAULT 0,
  promo_code text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  status text NOT NULL DEFAULT 'pending',
  purchased_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.league_access_purchases TO authenticated;
GRANT ALL ON public.league_access_purchases TO service_role;
ALTER TABLE public.league_access_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view own access purchases"
  ON public.league_access_purchases FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update access purchases"
  ON public.league_access_purchases FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_lap_updated BEFORE UPDATE ON public.league_access_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) league_payments (membership + event fees)
CREATE TABLE IF NOT EXISTS public.league_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.league_members(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.league_events(id) ON DELETE SET NULL,
  registration_id uuid REFERENCES public.league_event_registrations(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('membership','event')),
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  stripe_account_id text,
  status text NOT NULL DEFAULT 'pending',
  payer_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.league_payments TO authenticated;
GRANT ALL ON public.league_payments TO service_role;
ALTER TABLE public.league_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view league payments"
  ON public.league_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.golf_leagues l
      WHERE l.id = league_payments.league_id
        AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(),'admin'::app_role))
    )
  );
CREATE TRIGGER trg_lp_updated BEFORE UPDATE ON public.league_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Promo code validator RPC (public — no auth required so anon can preview discount)
CREATE OR REPLACE FUNCTION public.validate_league_promo_code(_code text, _base_cents integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.league_access_promo_codes%ROWTYPE;
  discount integer := 0;
BEGIN
  SELECT * INTO p FROM public.league_access_promo_codes
    WHERE upper(code) = upper(trim(_code)) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF p.max_uses IS NOT NULL AND p.times_used >= p.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;
  IF p.discount_type = 'percent' THEN
    discount := LEAST(_base_cents, ROUND(_base_cents * (p.discount_value::numeric / 100.0))::integer);
  ELSE
    discount := LEAST(_base_cents, p.discount_value);
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'code', p.code,
    'discount_type', p.discount_type,
    'discount_value', p.discount_value,
    'discount_cents', discount,
    'final_cents', GREATEST(0, _base_cents - discount)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_league_promo_code(text, integer) TO anon, authenticated;
