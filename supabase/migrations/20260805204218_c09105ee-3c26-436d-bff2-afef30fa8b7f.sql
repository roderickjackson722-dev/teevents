ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS hole_number TEXT,
  ADD COLUMN IF NOT EXISTS checkin_time TEXT;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sponsor_day_of_email_config JSONB,
  ADD COLUMN IF NOT EXISTS sponsor_parking_info TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_custom_notes TEXT;