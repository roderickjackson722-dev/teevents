ALTER TABLE public.flight_payouts
  ADD COLUMN IF NOT EXISTS excluded_registration_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS player_count_override integer;