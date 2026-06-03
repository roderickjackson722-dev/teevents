
ALTER TABLE public.sample_tournaments
  ADD COLUMN IF NOT EXISTS prospect_name TEXT,
  ADD COLUMN IF NOT EXISTS prospect_email TEXT,
  ADD COLUMN IF NOT EXISTS prospect_company TEXT,
  ADD COLUMN IF NOT EXISTS prospect_source TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS crm_notes TEXT;

CREATE TABLE IF NOT EXISTS public.sample_outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_tournament_id UUID NOT NULL REFERENCES public.sample_tournaments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_outreach_log TO authenticated;
GRANT ALL ON public.sample_outreach_log TO service_role;

ALTER TABLE public.sample_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sample outreach log"
  ON public.sample_outreach_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_sample_outreach_log_sample ON public.sample_outreach_log(sample_tournament_id, created_at DESC);
