ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS league_subscription_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS league_subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS league_subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS league_subscription_stripe_id TEXT,
  ADD COLUMN IF NOT EXISTS league_subscription_status TEXT DEFAULT 'inactive';