-- Drop the combined ALL policy and replace with separate policies
DROP POLICY IF EXISTS "Org members can manage sponsorship tiers" ON public.sponsorship_tiers;

-- Org members can view their tournament's sponsorship tiers
CREATE POLICY "Org members can view sponsorship tiers"
  ON public.sponsorship_tiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  );

-- Org members can insert sponsorship tiers for their tournaments
CREATE POLICY "Org members can insert sponsorship tiers"
  ON public.sponsorship_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  );

-- Org members can update sponsorship tiers for their tournaments
CREATE POLICY "Org members can update sponsorship tiers"
  ON public.sponsorship_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  );

-- Org members can delete sponsorship tiers for their tournaments
CREATE POLICY "Org members can delete sponsorship tiers"
  ON public.sponsorship_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id = sponsorship_tiers.tournament_id AND om.user_id = auth.uid()
    )
  );