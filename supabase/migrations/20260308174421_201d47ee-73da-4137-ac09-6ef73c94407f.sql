
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS printable_font text NOT NULL DEFAULT 'georgia',
  ADD COLUMN IF NOT EXISTS printable_layout text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS hole_pars jsonb NULL;
