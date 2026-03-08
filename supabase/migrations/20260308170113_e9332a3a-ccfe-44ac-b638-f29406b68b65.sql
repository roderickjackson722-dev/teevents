
-- Custom registration fields (toggleable defaults + custom questions)
CREATE TABLE public.tournament_registration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  field_type text NOT NULL DEFAULT 'text', -- text, dropdown, checkbox, toggle
  label text NOT NULL,
  options jsonb DEFAULT NULL, -- for dropdown: ["Option A","Option B"]
  is_required boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false, -- true for preset fields like phone, handicap
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_registration_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage registration fields"
  ON public.tournament_registration_fields FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_fields.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_fields.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view fields for published tournaments"
  ON public.tournament_registration_fields FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_fields.tournament_id AND t.site_published = true));

-- Registration add-ons (simple: name, price, description)
CREATE TABLE public.tournament_registration_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_registration_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage registration addons"
  ON public.tournament_registration_addons FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_addons.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_addons.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view addons for published tournaments"
  ON public.tournament_registration_addons FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_registration_addons.tournament_id AND t.site_published = true) AND is_active = true);

-- Tournament-specific promo codes
CREATE TABLE public.tournament_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent', -- percent or fixed
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, code)
);

ALTER TABLE public.tournament_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage tournament promo codes"
  ON public.tournament_promo_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_promo_codes.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_promo_codes.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can validate active tournament promo codes"
  ON public.tournament_promo_codes FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_promo_codes.tournament_id AND t.site_published = true));
