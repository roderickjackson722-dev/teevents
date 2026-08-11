ALTER TABLE public.league_payments
  ADD COLUMN IF NOT EXISTS gross_amount_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entry_source text NOT NULL DEFAULT 'online';