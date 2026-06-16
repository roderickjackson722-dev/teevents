ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS printable_logo_url text;
ALTER TABLE public.sponsorship_tiers ADD COLUMN IF NOT EXISTS show_remaining boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS group_label text;