
ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS fee_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.league_event_registrations
  ADD COLUMN IF NOT EXISTS fee_tier_id text,
  ADD COLUMN IF NOT EXISTS fee_tier_label text,
  ADD COLUMN IF NOT EXISTS fee_tier_amount_cents integer;
