ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS pass_platform_fee_to_members boolean NOT NULL DEFAULT true;