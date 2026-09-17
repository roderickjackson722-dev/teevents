ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS receipt_email_config jsonb;