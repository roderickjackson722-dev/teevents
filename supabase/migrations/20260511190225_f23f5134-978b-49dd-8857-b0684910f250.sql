
ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS flyer_image_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_keywords TEXT[];

INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-flyers', 'sales-flyers', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Admins can read sales flyers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sales-flyers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can upload sales flyers"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'sales-flyers' AND public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete sales flyers"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'sales-flyers' AND public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
