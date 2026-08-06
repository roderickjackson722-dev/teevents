ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sponsorship_day_of_email_config JSONB;