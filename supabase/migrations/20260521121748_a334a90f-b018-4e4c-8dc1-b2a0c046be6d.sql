
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS captain_label TEXT,
  ADD COLUMN IF NOT EXISTS max_waitlist_slots INTEGER;

ALTER TABLE public.organization_payout_methods
  ADD COLUMN IF NOT EXISTS connection_notified_at TIMESTAMPTZ;
