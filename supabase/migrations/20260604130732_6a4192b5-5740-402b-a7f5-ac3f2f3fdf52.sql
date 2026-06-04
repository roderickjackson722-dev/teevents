
-- Part 8: organization status
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Part 9: day-of email log
CREATE TABLE IF NOT EXISTS public.day_of_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  subject text,
  message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.day_of_emails TO authenticated;
GRANT ALL ON public.day_of_emails TO service_role;

ALTER TABLE public.day_of_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can view tournament email log"
  ON public.day_of_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = day_of_emails.tournament_id
        AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Org owners can log sent emails"
  ON public.day_of_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = day_of_emails.tournament_id
        AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE INDEX IF NOT EXISTS day_of_emails_tournament_id_idx ON public.day_of_emails(tournament_id);
CREATE INDEX IF NOT EXISTS day_of_emails_sent_at_idx ON public.day_of_emails(sent_at DESC);
