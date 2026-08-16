CREATE TABLE public.sample_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization_name TEXT,
  tournament_name TEXT NOT NULL,
  tournament_date DATE,
  expected_players INTEGER,
  current_tools TEXT,
  challenge TEXT,
  flyer_url TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sample_created BOOLEAN NOT NULL DEFAULT FALSE,
  sample_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.sample_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_requests TO authenticated;
GRANT ALL ON public.sample_requests TO service_role;

ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a sample request"
ON public.sample_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view sample requests"
ON public.sample_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sample requests"
ON public.sample_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sample requests"
ON public.sample_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sample_requests_updated_at
BEFORE UPDATE ON public.sample_requests
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

CREATE POLICY "Anyone can upload sample request files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'sample-requests');

CREATE POLICY "Admins can read sample request files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sample-requests' AND public.has_role(auth.uid(), 'admin'));