-- Per-tournament Pro fields
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pro_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tournaments_is_pro ON public.tournaments(is_pro);

-- Migrate legacy paid plans
UPDATE public.tournaments t
SET is_pro = TRUE,
    pro_paid_at = COALESCE(pro_paid_at, now())
WHERE t.organization_id IN (
  SELECT id FROM public.organizations WHERE plan IN ('starter', 'premium')
);

UPDATE public.organizations
SET plan = 'pro'
WHERE plan IN ('starter', 'premium');