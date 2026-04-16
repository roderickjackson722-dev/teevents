
-- Create director_shop_orders table
CREATE TABLE public.director_shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.platform_store_products(id),
  product_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  logo_url TEXT,
  order_notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_session_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.director_shop_orders ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon/authenticated (checkout flow)
CREATE POLICY "Anyone can create orders"
  ON public.director_shop_orders
  FOR INSERT
  WITH CHECK (true);

-- Only platform admins can view orders
CREATE POLICY "Admins can view all orders"
  ON public.director_shop_orders
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow edge functions (service role) to update orders
CREATE POLICY "Service role can update orders"
  ON public.director_shop_orders
  FOR UPDATE
  USING (true);

-- Timestamp trigger
CREATE TRIGGER update_director_shop_orders_updated_at
  BEFORE UPDATE ON public.director_shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('director-shop-logos', 'director-shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload logos
CREATE POLICY "Anyone can upload director shop logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'director-shop-logos');

-- Public read access
CREATE POLICY "Public read director shop logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'director-shop-logos');
