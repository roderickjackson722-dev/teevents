ALTER TABLE public.registration_groups ADD COLUMN IF NOT EXISTS starting_hole integer;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS pairings_config jsonb NOT NULL DEFAULT '{}'::jsonb;