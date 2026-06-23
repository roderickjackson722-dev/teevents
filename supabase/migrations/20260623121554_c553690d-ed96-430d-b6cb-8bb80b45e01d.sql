ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS early_registration_price_2_cents INTEGER,
  ADD COLUMN IF NOT EXISTS early_registration_price_4_cents INTEGER;