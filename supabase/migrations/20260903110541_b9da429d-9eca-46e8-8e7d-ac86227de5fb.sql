ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS site_hero_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS site_hero_position text NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS site_hero_blur boolean NOT NULL DEFAULT false;