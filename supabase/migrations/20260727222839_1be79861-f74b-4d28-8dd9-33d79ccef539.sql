ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS skins_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skins_mode text NOT NULL DEFAULT 'gross',
  ADD COLUMN IF NOT EXISTS skins_entry_fee_cents integer NOT NULL DEFAULT 0;