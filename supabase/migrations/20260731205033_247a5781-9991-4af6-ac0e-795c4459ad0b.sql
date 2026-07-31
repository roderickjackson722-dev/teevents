ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS event_confirmation_email_config jsonb;

ALTER TABLE public.league_event_registrations
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;