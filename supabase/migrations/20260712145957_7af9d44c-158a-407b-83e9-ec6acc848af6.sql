
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS donation_prompt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS donation_prompt_title text DEFAULT 'Support Our Mission',
  ADD COLUMN IF NOT EXISTS donation_prompt_description text,
  ADD COLUMN IF NOT EXISTS donation_preset_amounts integer[] NOT NULL DEFAULT ARRAY[1000,2500,5000,10000,25000,50000],
  ADD COLUMN IF NOT EXISTS donation_allow_custom boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donation_custom_label text DEFAULT 'Enter your own amount';

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS donation_amount_cents integer NOT NULL DEFAULT 0;
