
-- Demo requests from non-qualified prospects
CREATE TABLE public.demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tournament_name TEXT,
  expected_players INTEGER,
  role TEXT,
  heard_from TEXT,
  planning_status TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.demo_requests TO anon;
GRANT INSERT ON public.demo_requests TO authenticated;
GRANT ALL ON public.demo_requests TO service_role;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a demo request"
ON public.demo_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view demo requests"
ON public.demo_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update demo requests"
ON public.demo_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demo requests"
ON public.demo_requests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_demo_requests_updated_at
BEFORE UPDATE ON public.demo_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signup vetting responses tied to created accounts
CREATE TABLE public.signup_vetting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  planning_status TEXT,
  roles TEXT[],
  role_other TEXT,
  heard_from TEXT,
  heard_from_other TEXT,
  vetting_status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.signup_vetting TO authenticated;
GRANT ALL ON public.signup_vetting TO service_role;

ALTER TABLE public.signup_vetting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own vetting"
ON public.signup_vetting FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own vetting"
ON public.signup_vetting FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
