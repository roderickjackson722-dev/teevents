ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.registration_groups ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS group_field_rules JSONB;
UPDATE public.tournament_registrations SET is_captain = TRUE WHERE group_leader = TRUE AND is_captain = FALSE;