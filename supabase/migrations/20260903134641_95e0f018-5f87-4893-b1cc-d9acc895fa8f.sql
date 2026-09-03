ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS clippd_tournament_id TEXT,
  ADD COLUMN IF NOT EXISTS clippd_api_key TEXT,
  ADD COLUMN IF NOT EXISTS clippd_integration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clippd_last_sync TIMESTAMPTZ;

COMMENT ON COLUMN public.tournaments.clippd_api_key IS 'AES-GCM encrypted Clippd API key. Never expose to clients.';