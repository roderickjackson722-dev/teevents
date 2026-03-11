
CREATE TABLE public.platform_store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'merchandise',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_store_products ENABLE ROW LEVEL SECURITY;

-- Admins can manage platform store products
CREATE POLICY "Admins can manage platform store products"
  ON public.platform_store_products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view active platform store products
CREATE POLICY "Anyone can view active platform store products"
  ON public.platform_store_products
  FOR SELECT
  TO public
  USING (is_active = true);
