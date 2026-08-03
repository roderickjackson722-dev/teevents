ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS day_before_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS day_before_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_before_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS printable_options jsonb NOT NULL DEFAULT '{}'::jsonb;