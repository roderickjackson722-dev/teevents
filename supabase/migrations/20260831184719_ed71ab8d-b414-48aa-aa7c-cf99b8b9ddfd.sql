ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS digital_sponsor_purchased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_sponsor_purchased_at timestamptz,
  ADD COLUMN IF NOT EXISTS digital_sponsor_amount_cents integer;