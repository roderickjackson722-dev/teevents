
-- Organizer messages table for general questions/support
CREATE TABLE public.organizer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_user_id UUID,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'incoming',
  status TEXT NOT NULL DEFAULT 'unread',
  parent_message_id UUID REFERENCES public.organizer_messages(id),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_messages ENABLE ROW LEVEL SECURITY;

-- Org members can view and insert messages for their org
CREATE POLICY "Org members can view own messages"
  ON public.organizer_messages FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can send messages"
  ON public.organizer_messages FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND direction = 'incoming');

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
  ON public.organizer_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add new_account_last4 and new_routing_last4 to payout_change_requests for bank change details
ALTER TABLE public.payout_change_requests
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS new_routing_last4 TEXT,
  ADD COLUMN IF NOT EXISTS new_account_last4 TEXT,
  ADD COLUMN IF NOT EXISTS admin_toggle_granted BOOLEAN DEFAULT false;
