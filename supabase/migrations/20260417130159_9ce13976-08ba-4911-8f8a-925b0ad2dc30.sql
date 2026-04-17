-- Add leaderboard placement & display order to sponsors
ALTER TABLE public.tournament_sponsors
  ADD COLUMN IF NOT EXISTS leaderboard_placement TEXT NOT NULL DEFAULT 'sidebar',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Add live display + auto-refresh settings on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS live_display_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS live_display_refresh_seconds INTEGER NOT NULL DEFAULT 10;

-- Leaderboard gallery images
CREATE TABLE IF NOT EXISTS public.leaderboard_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_hero BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_gallery_tournament
  ON public.leaderboard_gallery(tournament_id);

ALTER TABLE public.leaderboard_gallery ENABLE ROW LEVEL SECURITY;

-- Public can read gallery for any published tournament
CREATE POLICY "Public can view gallery for published tournaments"
ON public.leaderboard_gallery
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.site_published = true
  )
);

-- Org members manage their gallery
CREATE POLICY "Org members can view their gallery"
ON public.leaderboard_gallery
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can insert gallery"
ON public.leaderboard_gallery
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can update gallery"
ON public.leaderboard_gallery
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can delete gallery"
ON public.leaderboard_gallery
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);