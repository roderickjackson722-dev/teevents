
-- 1. Add end_date to tournaments for multi-day events
ALTER TABLE public.tournaments ADD COLUMN end_date date DEFAULT NULL;

-- 2. Add max_group_size to tournaments (replaces boolean foursome_registration)
ALTER TABLE public.tournaments ADD COLUMN max_group_size integer NOT NULL DEFAULT 1;

-- Set existing foursome tournaments to max_group_size = 4
UPDATE public.tournaments SET max_group_size = 4 WHERE foursome_registration = true;

-- 3. Create registration tiers table
CREATE TABLE public.tournament_registration_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT NULL,
  eligibility_description text DEFAULT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  max_registrants integer DEFAULT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_registration_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage registration tiers"
  ON public.tournament_registration_tiers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can manage registration tiers"
  ON public.tournament_registration_tiers FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_registration_tiers.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_registration_tiers.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Public can view tiers for published tournaments"
  ON public.tournament_registration_tiers FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_registration_tiers.tournament_id
      AND t.site_published = true
    ) AND is_active = true
  );

-- 4. Add tier_id to tournament_registrations
ALTER TABLE public.tournament_registrations ADD COLUMN tier_id uuid DEFAULT NULL REFERENCES public.tournament_registration_tiers(id);
