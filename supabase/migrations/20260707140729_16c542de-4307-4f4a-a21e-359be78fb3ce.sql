
DROP VIEW IF EXISTS public.public_sponsor_registrations;
DROP VIEW IF EXISTS public.public_vendor_registrations;

CREATE OR REPLACE FUNCTION public.get_public_sponsor_registrations(_tournament_id uuid)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  tier_id uuid,
  company_name text,
  website_url text,
  description text,
  logo_url text,
  payment_status text,
  manually_approved boolean,
  show_on_public boolean,
  is_title_sponsor boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.tournament_id, s.tier_id, s.company_name, s.website_url,
    s.description, s.logo_url, s.payment_status, s.manually_approved,
    s.show_on_public, s.is_title_sponsor
  FROM public.sponsor_registrations s
  WHERE s.tournament_id = _tournament_id
    AND s.show_on_public = true
    AND (s.payment_status = 'paid' OR s.manually_approved = true);
$$;

REVOKE ALL ON FUNCTION public.get_public_sponsor_registrations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sponsor_registrations(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_vendor_registrations(_tournament_id uuid)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  tier_id uuid,
  vendor_name text,
  company_name text,
  website_url text,
  description text,
  logo_url text,
  business_type text,
  booth_location text,
  payment_status text,
  manually_approved boolean,
  show_on_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id, v.tournament_id, v.tier_id, v.vendor_name, v.company_name,
    v.website_url, v.description, v.logo_url, v.business_type,
    v.booth_location, v.payment_status, v.manually_approved, v.show_on_public
  FROM public.vendor_registrations v
  WHERE v.tournament_id = _tournament_id
    AND v.show_on_public = true
    AND (v.payment_status = 'paid' OR v.manually_approved = true);
$$;

REVOKE ALL ON FUNCTION public.get_public_vendor_registrations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_registrations(uuid) TO anon, authenticated;
