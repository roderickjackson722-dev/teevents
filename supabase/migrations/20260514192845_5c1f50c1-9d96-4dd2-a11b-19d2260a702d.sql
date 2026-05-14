
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS site_logo_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS site_logo_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gallery_position text NOT NULL DEFAULT 'default';
