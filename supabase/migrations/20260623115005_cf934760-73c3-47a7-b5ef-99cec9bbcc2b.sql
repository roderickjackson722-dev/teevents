ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS registration_intro_html text,
  ADD COLUMN IF NOT EXISTS registration_promo_html text;