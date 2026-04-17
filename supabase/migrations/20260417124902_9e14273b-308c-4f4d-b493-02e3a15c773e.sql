-- Custom slug + URL edit tracking + public-search opt-in
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS custom_slug TEXT,
  ADD COLUMN IF NOT EXISTS url_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS url_edit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_in_public_search BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique constraint on custom_slug (NULLs allowed, only non-null must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_custom_slug_unique 
  ON public.tournaments(custom_slug) 
  WHERE custom_slug IS NOT NULL;

-- Index for public-search browsing
CREATE INDEX IF NOT EXISTS idx_tournaments_public_search
  ON public.tournaments(show_in_public_search, date)
  WHERE show_in_public_search = TRUE AND site_published = TRUE;