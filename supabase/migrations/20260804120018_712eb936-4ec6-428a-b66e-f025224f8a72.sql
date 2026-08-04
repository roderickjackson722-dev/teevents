-- Let organizers read the email log rows for their own organization
CREATE POLICY "Org members can read their email log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
);

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;

-- In-app alerts surfaced to organizers (e.g. a reminder email send failed)
CREATE TABLE IF NOT EXISTS public.organizer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id uuid,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.organizer_notifications TO authenticated;
GRANT ALL ON public.organizer_notifications TO service_role;

ALTER TABLE public.organizer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their alerts"
ON public.organizer_notifications
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can update their alerts"
ON public.organizer_notifications
FOR UPDATE
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can delete their alerts"
ON public.organizer_notifications
FOR DELETE
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_organizer_notifications_org
ON public.organizer_notifications (organization_id, created_at DESC);

CREATE TRIGGER update_organizer_notifications_updated_at
BEFORE UPDATE ON public.organizer_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();