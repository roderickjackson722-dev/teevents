
-- ============================================================
-- ITEM 1: Sponsorship spot availability
-- ============================================================
ALTER TABLE public.sponsorship_tiers
  ADD COLUMN IF NOT EXISTS total_spots INTEGER,
  ADD COLUMN IF NOT EXISTS spots_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_type TEXT;

-- ============================================================
-- ITEM 2: Sponsor registrations — public visibility
-- ============================================================
ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS show_on_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS manually_approved BOOLEAN NOT NULL DEFAULT false;

-- Public can read paid OR manually_approved sponsor registrations
DROP POLICY IF EXISTS "Public can view approved sponsor registrations" ON public.sponsor_registrations;
CREATE POLICY "Public can view approved sponsor registrations"
ON public.sponsor_registrations FOR SELECT
USING (
  show_on_public = true
  AND (payment_status = 'paid' OR manually_approved = true)
);

-- Trigger to keep sponsorship_tiers.spots_used in sync
CREATE OR REPLACE FUNCTION public.sync_sponsorship_tier_spots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_counted boolean := false;
  is_counted boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_counted := (NEW.payment_status = 'paid' OR NEW.manually_approved = true);
    IF is_counted AND NEW.tier_id IS NOT NULL THEN
      UPDATE public.sponsorship_tiers
        SET spots_used = COALESCE(spots_used, 0) + 1
        WHERE id = NEW.tier_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    was_counted := (OLD.payment_status = 'paid' OR OLD.manually_approved = true);
    is_counted := (NEW.payment_status = 'paid' OR NEW.manually_approved = true);
    IF was_counted AND NOT is_counted AND OLD.tier_id IS NOT NULL THEN
      UPDATE public.sponsorship_tiers
        SET spots_used = GREATEST(0, COALESCE(spots_used, 0) - 1)
        WHERE id = OLD.tier_id;
    ELSIF NOT was_counted AND is_counted AND NEW.tier_id IS NOT NULL THEN
      UPDATE public.sponsorship_tiers
        SET spots_used = COALESCE(spots_used, 0) + 1
        WHERE id = NEW.tier_id;
    ELSIF was_counted AND is_counted AND COALESCE(OLD.tier_id::text, '') <> COALESCE(NEW.tier_id::text, '') THEN
      IF OLD.tier_id IS NOT NULL THEN
        UPDATE public.sponsorship_tiers
          SET spots_used = GREATEST(0, COALESCE(spots_used, 0) - 1)
          WHERE id = OLD.tier_id;
      END IF;
      IF NEW.tier_id IS NOT NULL THEN
        UPDATE public.sponsorship_tiers
          SET spots_used = COALESCE(spots_used, 0) + 1
          WHERE id = NEW.tier_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    was_counted := (OLD.payment_status = 'paid' OR OLD.manually_approved = true);
    IF was_counted AND OLD.tier_id IS NOT NULL THEN
      UPDATE public.sponsorship_tiers
        SET spots_used = GREATEST(0, COALESCE(spots_used, 0) - 1)
        WHERE id = OLD.tier_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sponsorship_tier_spots ON public.sponsor_registrations;
CREATE TRIGGER trg_sync_sponsorship_tier_spots
AFTER INSERT OR UPDATE OR DELETE ON public.sponsor_registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_sponsorship_tier_spots();

-- Backfill spots_used from existing data
UPDATE public.sponsorship_tiers st
SET spots_used = sub.cnt
FROM (
  SELECT tier_id, COUNT(*)::int AS cnt
  FROM public.sponsor_registrations
  WHERE tier_id IS NOT NULL AND (payment_status = 'paid' OR manually_approved = true)
  GROUP BY tier_id
) sub
WHERE st.id = sub.tier_id;

-- ============================================================
-- ITEM 3: Logo color override
-- ============================================================
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS site_logo_color_mode TEXT NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS site_logo_color_value TEXT;

-- ============================================================
-- ITEM 4: Vendor tier-based flow
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  benefits TEXT,
  total_spots INTEGER,
  spots_used INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_tiers_tournament ON public.vendor_tiers(tournament_id);

ALTER TABLE public.vendor_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendor tiers"
ON public.vendor_tiers FOR SELECT USING (is_active = true);

CREATE POLICY "Org members can view vendor tiers"
ON public.vendor_tiers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t
  WHERE t.id = vendor_tiers.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Org members can insert vendor tiers"
ON public.vendor_tiers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t
  WHERE t.id = vendor_tiers.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Org members can update vendor tiers"
ON public.vendor_tiers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t
  WHERE t.id = vendor_tiers.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Org members can delete vendor tiers"
ON public.vendor_tiers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t
  WHERE t.id = vendor_tiers.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Admins manage all vendor tiers"
ON public.vendor_tiers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_vendor_tiers_updated_at
BEFORE UPDATE ON public.vendor_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend vendor_registrations for tier-based flow
ALTER TABLE public.vendor_registrations
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.vendor_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS show_on_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS manually_approved BOOLEAN NOT NULL DEFAULT false;

-- Make legacy NOT NULL fields nullable so the new flow can insert without them
ALTER TABLE public.vendor_registrations
  ALTER COLUMN business_type DROP NOT NULL;

-- Public can read paid or approved vendor registrations
DROP POLICY IF EXISTS "Public can view approved vendor registrations" ON public.vendor_registrations;
CREATE POLICY "Public can view approved vendor registrations"
ON public.vendor_registrations FOR SELECT
USING (
  show_on_public = true
  AND (payment_status = 'paid' OR manually_approved = true)
);

-- Sync trigger for vendor tier spots
CREATE OR REPLACE FUNCTION public.sync_vendor_tier_spots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_counted boolean := false;
  is_counted boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_counted := (NEW.payment_status = 'paid' OR NEW.manually_approved = true);
    IF is_counted AND NEW.tier_id IS NOT NULL THEN
      UPDATE public.vendor_tiers SET spots_used = COALESCE(spots_used,0)+1 WHERE id = NEW.tier_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    was_counted := (OLD.payment_status = 'paid' OR OLD.manually_approved = true);
    is_counted := (NEW.payment_status = 'paid' OR NEW.manually_approved = true);
    IF was_counted AND NOT is_counted AND OLD.tier_id IS NOT NULL THEN
      UPDATE public.vendor_tiers SET spots_used = GREATEST(0,COALESCE(spots_used,0)-1) WHERE id = OLD.tier_id;
    ELSIF NOT was_counted AND is_counted AND NEW.tier_id IS NOT NULL THEN
      UPDATE public.vendor_tiers SET spots_used = COALESCE(spots_used,0)+1 WHERE id = NEW.tier_id;
    ELSIF was_counted AND is_counted AND COALESCE(OLD.tier_id::text,'') <> COALESCE(NEW.tier_id::text,'') THEN
      IF OLD.tier_id IS NOT NULL THEN
        UPDATE public.vendor_tiers SET spots_used = GREATEST(0,COALESCE(spots_used,0)-1) WHERE id = OLD.tier_id;
      END IF;
      IF NEW.tier_id IS NOT NULL THEN
        UPDATE public.vendor_tiers SET spots_used = COALESCE(spots_used,0)+1 WHERE id = NEW.tier_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    was_counted := (OLD.payment_status = 'paid' OR OLD.manually_approved = true);
    IF was_counted AND OLD.tier_id IS NOT NULL THEN
      UPDATE public.vendor_tiers SET spots_used = GREATEST(0,COALESCE(spots_used,0)-1) WHERE id = OLD.tier_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vendor_tier_spots ON public.vendor_registrations;
CREATE TRIGGER trg_sync_vendor_tier_spots
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_tier_spots();
