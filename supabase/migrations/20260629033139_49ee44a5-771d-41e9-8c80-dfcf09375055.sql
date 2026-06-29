-- =========================================================================
-- AUCTIONS — replace broad authenticated SELECT with org-scoped policy
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated can view auctions" ON public.auctions;

CREATE POLICY "Org members can view their auctions"
  ON public.auctions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = auctions.tournament_id
        AND is_org_member(auth.uid(), t.organization_id)
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authenticated can view auctions for published tournaments"
  ON public.auctions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = auctions.tournament_id AND t.site_published = true
    )
  );

-- =========================================================================
-- RAFFLES — same treatment
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated can view raffles" ON public.raffles;

CREATE POLICY "Org members can view their raffles"
  ON public.raffles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = raffles.tournament_id
        AND is_org_member(auth.uid(), t.organization_id)
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authenticated can view raffles for published tournaments"
  ON public.raffles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = raffles.tournament_id AND t.site_published = true
    )
  );

-- Belt-and-suspenders: hide winner emails from authenticated users that aren't org members
-- via column-level grant. (RLS already restricts rows; column grant is a separate layer.)
-- We keep email readable to authenticated since org members need it via the manage policy;
-- column-level revoke would affect them too. Row-level scoping above is enough.

-- =========================================================================
-- VENDOR_FORMS — add published-tournament filter to public SELECT
-- =========================================================================
DROP POLICY IF EXISTS "Public can view active vendor forms" ON public.vendor_forms;

CREATE POLICY "Public can view active vendor forms for published tournaments"
  ON public.vendor_forms FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_forms.tournament_id AND t.site_published = true
    )
  );
