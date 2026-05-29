CREATE TABLE public.outreach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid REFERENCES public.sample_tournaments(id) ON DELETE SET NULL,
  prospect_email text NOT NULL,
  prospect_name text,
  email_type text NOT NULL CHECK (email_type IN ('initial','followup','custom')),
  subject text,
  template_key text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.outreach_logs TO authenticated;
GRANT ALL ON public.outreach_logs TO service_role;

ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outreach logs"
  ON public.outreach_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert outreach logs"
  ON public.outreach_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX outreach_logs_sent_at_idx ON public.outreach_logs (sent_at DESC);
CREATE INDEX outreach_logs_sample_id_idx ON public.outreach_logs (sample_id);