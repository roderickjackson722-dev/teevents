CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  template_kind TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  recipient_ids JSONB,
  recipient_count INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ,
  sent_count INTEGER,
  failed_count INTEGER,
  error TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_emails_due ON public.scheduled_emails (status, scheduled_for);
CREATE INDEX idx_scheduled_emails_tournament ON public.scheduled_emails (tournament_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO authenticated;
GRANT ALL ON public.scheduled_emails TO service_role;

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage scheduled emails for their tournaments"
ON public.scheduled_emails FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = scheduled_emails.tournament_id AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = scheduled_emails.tournament_id AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER update_scheduled_emails_updated_at
BEFORE UPDATE ON public.scheduled_emails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();