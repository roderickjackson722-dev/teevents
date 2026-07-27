ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS shirt_size TEXT,
  ADD COLUMN IF NOT EXISTS avg_18_score INTEGER,
  ADD COLUMN IF NOT EXISTS avg_9_score INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.league_payments DROP CONSTRAINT IF EXISTS league_payments_kind_check;
ALTER TABLE public.league_payments ADD CONSTRAINT league_payments_kind_check
  CHECK (kind = ANY (ARRAY['membership'::text, 'event'::text, 'registration'::text]));

CREATE TABLE public.league_registration_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL UNIQUE REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  league_fee_cents INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  promo_code_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pass_platform_fee_to_player BOOLEAN NOT NULL DEFAULT FALSE,
  terms_text TEXT,
  intro_text TEXT,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.league_registration_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_registration_forms TO authenticated;
GRANT ALL ON public.league_registration_forms TO service_role;
ALTER TABLE public.league_registration_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage league registration forms"
ON public.league_registration_forms FOR ALL
USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Public can view forms of public leagues"
ON public.league_registration_forms FOR SELECT
USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));

CREATE TRIGGER trg_lrf_updated BEFORE UPDATE ON public.league_registration_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.league_registration_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_percent INTEGER,
  discount_cents INTEGER,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, code)
);

GRANT SELECT ON public.league_registration_promo_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_registration_promo_codes TO authenticated;
GRANT ALL ON public.league_registration_promo_codes TO service_role;
ALTER TABLE public.league_registration_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage league promo codes"
ON public.league_registration_promo_codes FOR ALL
USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Public can view active promo codes of public leagues"
ON public.league_registration_promo_codes FOR SELECT
USING (is_active = true AND EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));

CREATE TRIGGER trg_lrpc_updated BEFORE UPDATE ON public.league_registration_promo_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.league_registration_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.league_members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  promo_code TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lrr_league ON public.league_registration_responses(league_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_registration_responses TO authenticated;
GRANT ALL ON public.league_registration_responses TO service_role;
ALTER TABLE public.league_registration_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage league registration responses"
ON public.league_registration_responses FOR ALL
USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Members can view their own registration response"
ON public.league_registration_responses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_lrr_updated BEFORE UPDATE ON public.league_registration_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();