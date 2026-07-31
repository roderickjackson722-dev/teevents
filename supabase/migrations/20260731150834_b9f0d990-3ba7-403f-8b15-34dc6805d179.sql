CREATE TABLE public.demo_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_tournament_id UUID REFERENCES public.demo_tournaments(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  prospect_email TEXT NOT NULL,
  prospect_name TEXT,
  access_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_access_tournament ON public.demo_access(tournament_id);
CREATE INDEX idx_demo_access_token ON public.demo_access(access_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_access TO authenticated;
GRANT ALL ON public.demo_access TO service_role;

ALTER TABLE public.demo_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage demo access"
ON public.demo_access FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.demo_tournaments ADD COLUMN IF NOT EXISTS view_only BOOLEAN NOT NULL DEFAULT TRUE;