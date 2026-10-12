ALTER TABLE public.organizer_toolboxes
  ADD COLUMN IF NOT EXISTS onboarding_event jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_choice text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;