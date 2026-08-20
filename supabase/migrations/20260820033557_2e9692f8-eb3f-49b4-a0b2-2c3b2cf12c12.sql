ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS branding_removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branding_removed_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branding_override_reason text;