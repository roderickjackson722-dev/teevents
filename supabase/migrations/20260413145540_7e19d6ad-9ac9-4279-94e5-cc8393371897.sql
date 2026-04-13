
CREATE TABLE public.payout_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'stripe',
  note TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payout notes"
ON public.payout_notes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_payout_notes_transaction ON public.payout_notes(transaction_id);
