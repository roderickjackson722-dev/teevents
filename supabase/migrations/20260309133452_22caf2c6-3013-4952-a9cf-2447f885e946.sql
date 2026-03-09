
CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from the edge function (service role)
-- No public read access needed
CREATE POLICY "Allow service role full access" ON public.site_visits
  FOR ALL USING (true) WITH CHECK (true);
