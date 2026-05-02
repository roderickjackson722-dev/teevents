
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','bounced','complained','suppressed')),
  source TEXT,
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  tournament_id UUID,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_created_at ON public.email_send_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message_id ON public.email_send_log (message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON public.email_send_log (template_name);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON public.email_send_log (status);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email log"
  ON public.email_send_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
