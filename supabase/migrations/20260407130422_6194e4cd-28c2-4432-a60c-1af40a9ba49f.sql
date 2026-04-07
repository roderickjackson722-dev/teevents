
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS allow_cover_fees BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS covered_fees BOOLEAN NOT NULL DEFAULT false;
