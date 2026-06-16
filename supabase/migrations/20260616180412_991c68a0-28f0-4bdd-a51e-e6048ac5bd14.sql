
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS demo_prospect_platform text,
  ADD COLUMN IF NOT EXISTS demo_prospect_other text,
  ADD COLUMN IF NOT EXISTS demo_prospect_email text,
  ADD COLUMN IF NOT EXISTS demo_prospect_name text,
  ADD COLUMN IF NOT EXISTS demo_notes text,
  ADD COLUMN IF NOT EXISTS demo_prepared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS demo_conversion_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS demo_conversion_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tournaments_demo_conversion_token ON public.tournaments(demo_conversion_token) WHERE demo_conversion_token IS NOT NULL;
