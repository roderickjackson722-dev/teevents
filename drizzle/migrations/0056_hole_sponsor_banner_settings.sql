ALTER TABLE public.tournament_sponsors
  ADD COLUMN IF NOT EXISTS hole_banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hole_banner_display text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS hole_banner_name text,
  ADD COLUMN IF NOT EXISTS hole_banner_logo_url text,
  ADD COLUMN IF NOT EXISTS hole_banner_placement text NOT NULL DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS hole_banner_scope text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS hole_banner_holes integer[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tournament_sponsors
  ADD CONSTRAINT tournament_sponsors_hole_banner_display_chk CHECK (hole_banner_display IN ('logo','name','both')),
  ADD CONSTRAINT tournament_sponsors_hole_banner_placement_chk CHECK (hole_banner_placement IN ('top','bottom')),
  ADD CONSTRAINT tournament_sponsors_hole_banner_scope_chk CHECK (hole_banner_scope IN ('per_hole','all','holes'));