ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS survey_email_config jsonb;