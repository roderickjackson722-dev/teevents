ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS branding_removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS branding_removed_by uuid,
  ADD COLUMN IF NOT EXISTS branding_payment_session_id text,
  ADD COLUMN IF NOT EXISTS branding_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS branding_receipt_url text,
  ADD COLUMN IF NOT EXISTS branding_admin_override_at timestamptz;

CREATE TABLE IF NOT EXISTS public.branding_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  actor_type text NOT NULL DEFAULT 'organizer',
  action text NOT NULL,
  amount_cents integer,
  stripe_session_id text,
  stripe_payment_intent_id text,
  receipt_url text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branding_audit_log_tournament_idx ON public.branding_audit_log (tournament_id, created_at DESC);

GRANT SELECT ON public.branding_audit_log TO authenticated;
GRANT ALL ON public.branding_audit_log TO service_role;

ALTER TABLE public.branding_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view branding history" ON public.branding_audit_log;
CREATE POLICY "Org members can view branding history"
ON public.branding_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    JOIN public.org_members m ON m.organization_id = t.organization_id
    WHERE t.id = branding_audit_log.tournament_id
      AND m.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);