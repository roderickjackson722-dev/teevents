
CREATE TABLE public.tournament_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view messages"
  ON public.tournament_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_messages.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can insert messages"
  ON public.tournament_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_messages.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members can delete messages"
  ON public.tournament_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_messages.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  ));
