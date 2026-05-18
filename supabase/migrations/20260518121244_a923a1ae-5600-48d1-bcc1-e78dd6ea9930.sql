
-- 1. Sponsorship sold-out price hiding
ALTER TABLE public.sponsorship_tiers
ADD COLUMN IF NOT EXISTS hide_price_when_sold_out BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Media Clips
CREATE TABLE IF NOT EXISTS public.media_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_clips_tournament ON public.media_clips(tournament_id, display_order);
ALTER TABLE public.media_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active media clips"
  ON public.media_clips FOR SELECT
  USING (is_active = true);

CREATE POLICY "Org owners can manage media clips"
  ON public.media_clips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = media_clips.tournament_id
        AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = media_clips.tournament_id
        AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE TRIGGER trg_media_clips_updated_at
  BEFORE UPDATE ON public.media_clips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tab title for media on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS media_tab_title TEXT DEFAULT 'Media';

-- 5. Day-of tournament page
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS day_of_page_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_of_page_mode TEXT NOT NULL DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS day_of_welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS day_of_announcements TEXT,
  ADD COLUMN IF NOT EXISTS day_of_course_map_url TEXT;
