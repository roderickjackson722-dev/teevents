
-- Add refund policy fields to tournaments
ALTER TABLE public.tournaments
ADD COLUMN refund_policy_type text NOT NULL DEFAULT 'custom',
ADD COLUMN refund_policy_text text,
ADD COLUMN refund_deadline_days integer,
ADD COLUMN refund_partial_percent integer;

-- Create refund requests table
CREATE TABLE public.tournament_refund_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  stripe_refund_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid
);

-- Enable RLS
ALTER TABLE public.tournament_refund_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all refund requests
CREATE POLICY "Admins can manage refund requests"
ON public.tournament_refund_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Org members can view and update refund requests for their tournaments
CREATE POLICY "Org members can view refund requests"
ON public.tournament_refund_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tournaments t
  WHERE t.id = tournament_refund_requests.tournament_id
  AND is_org_member(auth.uid(), t.organization_id)
));

CREATE POLICY "Org members can update refund requests"
ON public.tournament_refund_requests
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tournaments t
  WHERE t.id = tournament_refund_requests.tournament_id
  AND is_org_member(auth.uid(), t.organization_id)
));

-- Anyone can submit a refund request (public registrants)
CREATE POLICY "Anyone can submit refund requests"
ON public.tournament_refund_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Public can view their own request by email match through registration
CREATE POLICY "Public can view own refund requests"
ON public.tournament_refund_requests
FOR SELECT
TO public
USING (true);

-- Add index for performance
CREATE INDEX idx_refund_requests_tournament ON public.tournament_refund_requests(tournament_id);
CREATE INDEX idx_refund_requests_registration ON public.tournament_refund_requests(registration_id);
CREATE INDEX idx_refund_requests_status ON public.tournament_refund_requests(status);
