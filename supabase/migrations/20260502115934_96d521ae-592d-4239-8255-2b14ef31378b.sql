-- Add booth fee default on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS vendor_booth_fee_cents integer;

-- =========================================================
-- vendor_forms
-- =========================================================
CREATE TABLE IF NOT EXISTS public.vendor_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id)
);

ALTER TABLE public.vendor_forms ENABLE ROW LEVEL SECURITY;

-- Public can read active forms (so /t/:slug/vendors works for anonymous users)
CREATE POLICY "Public can view active vendor forms"
  ON public.vendor_forms FOR SELECT
  USING (is_active = true);

-- Org members can manage their tournament's form
CREATE POLICY "Org members can view vendor forms"
  ON public.vendor_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_forms.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can insert vendor forms"
  ON public.vendor_forms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_forms.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can update vendor forms"
  ON public.vendor_forms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_forms.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can delete vendor forms"
  ON public.vendor_forms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_forms.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_vendor_forms_updated_at
  BEFORE UPDATE ON public.vendor_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- vendor_registrations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.vendor_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  business_type text,
  answers jsonb DEFAULT '{}'::jsonb,
  booth_location text,
  booth_fee_cents integer,
  payment_status text NOT NULL DEFAULT 'pending', -- pending | paid | waived
  status text NOT NULL DEFAULT 'pending_approval', -- pending_approval | approved | denied
  notes text,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  stripe_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_registrations_tournament
  ON public.vendor_registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_vendor_registrations_status
  ON public.vendor_registrations (tournament_id, status);

ALTER TABLE public.vendor_registrations ENABLE ROW LEVEL SECURITY;

-- Public (anonymous vendors) can submit a registration for any tournament
CREATE POLICY "Anyone can submit a vendor registration"
  ON public.vendor_registrations FOR INSERT
  WITH CHECK (true);

-- Public canNOT read other vendors. Only org members can read.
CREATE POLICY "Org members can view vendor registrations"
  ON public.vendor_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_registrations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can update vendor registrations"
  ON public.vendor_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_registrations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can delete vendor registrations"
  ON public.vendor_registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_registrations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_vendor_registrations_updated_at
  BEFORE UPDATE ON public.vendor_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- vendor_booth_locations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.vendor_booth_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  description text,
  is_available boolean NOT NULL DEFAULT true,
  assigned_to uuid REFERENCES public.vendor_registrations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_booth_locations_tournament
  ON public.vendor_booth_locations (tournament_id);

ALTER TABLE public.vendor_booth_locations ENABLE ROW LEVEL SECURITY;

-- Public can view available booths (used by public vendor form to show options)
CREATE POLICY "Public can view booth locations"
  ON public.vendor_booth_locations FOR SELECT
  USING (true);

CREATE POLICY "Org members can insert booth locations"
  ON public.vendor_booth_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_booth_locations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can update booth locations"
  ON public.vendor_booth_locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_booth_locations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org members can delete booth locations"
  ON public.vendor_booth_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_booth_locations.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_vendor_booth_locations_updated_at
  BEFORE UPDATE ON public.vendor_booth_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();