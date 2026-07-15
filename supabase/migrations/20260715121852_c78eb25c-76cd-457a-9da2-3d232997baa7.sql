ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS custom_answers jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tournament_registrations.custom_answers IS
  'Array of {field_id, label, field_type, answer} objects captured from tournament_registration_fields at submission time.';

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_custom_answers
  ON public.tournament_registrations USING gin (custom_answers);