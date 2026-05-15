-- Demo leads captured before the interactive demo tour starts
CREATE TABLE public.demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('organizer','sponsor','looking')),
  demo_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  demo_completed BOOLEAN NOT NULL DEFAULT FALSE,
  demo_completed_at TIMESTAMPTZ,
  demo_exited_at TIMESTAMPTZ,
  last_step_index INTEGER,
  feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_text TEXT,
  feedback_reasons TEXT[],
  feedback_submitted_at TIMESTAMPTZ,
  welcome_email_sent_at TIMESTAMPTZ,
  followup_24h_sent_at TIMESTAMPTZ,
  followup_7d_sent_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX demo_leads_email_unique ON public.demo_leads (lower(email));
CREATE INDEX demo_leads_completed_idx ON public.demo_leads (demo_completed, demo_completed_at);
CREATE INDEX demo_leads_signed_up_idx ON public.demo_leads (signed_up_at);

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (lead capture is unauthenticated)
CREATE POLICY "Anyone can create a demo lead"
  ON public.demo_leads
  FOR INSERT
  WITH CHECK (true);

-- Public can update their own lead by id (lead id stored in localStorage on the client)
CREATE POLICY "Anyone can update a demo lead"
  ON public.demo_leads
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only platform admins can read leads
CREATE POLICY "Admins can read demo leads"
  ON public.demo_leads
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demo leads"
  ON public.demo_leads
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER demo_leads_updated_at
  BEFORE UPDATE ON public.demo_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Per-event analytics for the interactive demo
CREATE TABLE public.demo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.demo_leads(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  step_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX demo_events_lead_id_idx ON public.demo_events (lead_id);
CREATE INDEX demo_events_event_name_idx ON public.demo_events (event_name, created_at);

ALTER TABLE public.demo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a demo event"
  ON public.demo_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read demo events"
  ON public.demo_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));