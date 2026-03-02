
-- Budget items table
CREATE TABLE public.tournament_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_paid boolean DEFAULT false,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget items"
  ON public.tournament_budget_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can insert budget items"
  ON public.tournament_budget_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can update budget items"
  ON public.tournament_budget_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can delete budget items"
  ON public.tournament_budget_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

-- Sponsors table
CREATE TABLE public.tournament_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'silver',
  logo_url text,
  website_url text,
  description text,
  amount numeric(12,2),
  is_paid boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_sponsors ENABLE ROW LEVEL SECURITY;

-- Org members can manage sponsors
CREATE POLICY "Org members can view sponsors"
  ON public.tournament_sponsors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can insert sponsors"
  ON public.tournament_sponsors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can update sponsors"
  ON public.tournament_sponsors FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can delete sponsors"
  ON public.tournament_sponsors FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

-- Public can view sponsors for published tournaments (for public tournament page)
CREATE POLICY "Public can view sponsors for published tournaments"
  ON public.tournament_sponsors FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.site_published = true
  ));
