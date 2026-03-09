
-- Product templates table for reusable product definitions
CREATE TABLE public.product_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'merchandise',
  vendor_name TEXT,
  vendor_url TEXT,
  vendor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage product templates"
  ON public.product_templates FOR ALL
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Add vendor/source tracking columns to existing store products
ALTER TABLE public.tournament_store_products
  ADD COLUMN vendor_name TEXT,
  ADD COLUMN vendor_url TEXT,
  ADD COLUMN template_id UUID REFERENCES public.product_templates(id) ON DELETE SET NULL;
