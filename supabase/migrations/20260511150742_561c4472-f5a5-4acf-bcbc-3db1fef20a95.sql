ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS detected_setup TEXT,
  ADD COLUMN IF NOT EXISTS calendly_link TEXT;