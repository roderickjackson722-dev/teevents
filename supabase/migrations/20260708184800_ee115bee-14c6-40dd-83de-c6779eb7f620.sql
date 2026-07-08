
-- Add customization columns for event ticketing
ALTER TABLE public.public_events
  ADD COLUMN IF NOT EXISTS purchase_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmation_email_subject text,
  ADD COLUMN IF NOT EXISTS confirmation_email_body text;

ALTER TABLE public.event_ticket_purchases
  ADD COLUMN IF NOT EXISTS buyer_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure admins can read purchases for the sales dashboard
DROP POLICY IF EXISTS "Admins can view event ticket purchases" ON public.event_ticket_purchases;
CREATE POLICY "Admins can view event ticket purchases"
  ON public.event_ticket_purchases
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
