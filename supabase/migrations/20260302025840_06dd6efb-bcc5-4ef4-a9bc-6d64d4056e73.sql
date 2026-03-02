
-- Tournament store products table
CREATE TABLE public.tournament_store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  category text NOT NULL DEFAULT 'merchandise',
  is_active boolean DEFAULT true,
  purchase_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tournament_store_products ENABLE ROW LEVEL SECURITY;

-- Org members full CRUD
CREATE POLICY "Org members can view store products"
  ON public.tournament_store_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_store_products.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can insert store products"
  ON public.tournament_store_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_store_products.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can update store products"
  ON public.tournament_store_products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_store_products.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can delete store products"
  ON public.tournament_store_products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_store_products.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

-- Public can view products for published tournaments
CREATE POLICY "Public can view store products for published tournaments"
  ON public.tournament_store_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_store_products.tournament_id
    AND t.site_published = true
  ) AND is_active = true);
