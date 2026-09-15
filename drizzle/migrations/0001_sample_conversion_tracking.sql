ALTER TABLE public.sample_tournaments
  ADD COLUMN IF NOT EXISTS prospect_phone text,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_status text NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_tournament_id uuid,
  ADD COLUMN IF NOT EXISTS conversion_notes text;

CREATE INDEX IF NOT EXISTS sample_tournaments_conversion_status_idx
  ON public.sample_tournaments (conversion_status);