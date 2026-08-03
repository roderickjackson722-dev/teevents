ALTER TABLE public.registration_groups
  ADD COLUMN IF NOT EXISTS tee_time text,
  ADD COLUMN IF NOT EXISTS tee_times jsonb NOT NULL DEFAULT '{}'::jsonb;