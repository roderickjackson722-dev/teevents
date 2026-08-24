ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS flat_rate_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flat_rate_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flat_rate_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flat_rate_amount_cents INTEGER NOT NULL DEFAULT 29900,
  ADD COLUMN IF NOT EXISTS flat_rate_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS flat_rate_admin_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flat_rate_override_reason TEXT;

CREATE TABLE IF NOT EXISTS public.tournament_flat_rate_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournament_flat_rate_log TO authenticated;
GRANT ALL ON public.tournament_flat_rate_log TO service_role;

ALTER TABLE public.tournament_flat_rate_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their tournament flat-rate log"
ON public.tournament_flat_rate_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    JOIN public.org_members m ON m.organization_id = t.organization_id
    WHERE t.id = tournament_flat_rate_log.tournament_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all flat-rate log entries"
ON public.tournament_flat_rate_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS tournament_flat_rate_log_tournament_idx
  ON public.tournament_flat_rate_log(tournament_id, created_at DESC);