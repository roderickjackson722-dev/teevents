
-- 1) promo_codes: drop the public SELECT policy. Edge functions use the service
-- role and bypass RLS, so no public read is needed.
DROP POLICY IF EXISTS "Anyone can validate promo codes" ON public.promo_codes;

-- 2) tournament_donations: drop the anon row-level policy that exposed
-- donor_email, replace with a SECURITY DEFINER RPC that returns only the
-- aggregate total for a published tournament (no PII).
DROP POLICY IF EXISTS "Anon can view donation totals for published tournaments" ON public.tournament_donations;

CREATE OR REPLACE FUNCTION public.get_public_donation_total(_tournament_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(d.amount_cents), 0)::bigint
  FROM public.tournament_donations d
  JOIN public.tournaments t ON t.id = d.tournament_id
  WHERE d.tournament_id = _tournament_id
    AND d.status = 'completed'
    AND t.site_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_donation_total(uuid) TO anon, authenticated;

-- 3) director-shop-logos storage bucket: require authentication for uploads
-- so anonymous users cannot dump arbitrary files into the public bucket.
DROP POLICY IF EXISTS "Anyone can upload director shop logos" ON storage.objects;

CREATE POLICY "Authenticated users can upload director shop logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'director-shop-logos');
