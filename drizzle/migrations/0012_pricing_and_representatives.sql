-- Add additive pricing and representative fields to support the 2024-Q4 rollout
-- and grandfather existing records into the 'legacy' model.

-- 1. Organizations: Add pricing model version and dedicated representative details
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS dedicated_rep_name text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_email text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_phone text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_avatar_url text;

-- 2. Tournaments: Add pricing version and fee overrides for granular control
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pricing_version text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS base_fee_cents integer;

-- 3. Golf Leagues: Add pricing version and annual fee override
ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS pricing_version text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS annual_fee_cents integer;

-- 4. Explicit Backfill (Safety)
-- Ensures all existing records are marked as legacy before new records start using new defaults
UPDATE public.organizations SET pricing_model = 'legacy' WHERE pricing_model IS NULL;
UPDATE public.tournaments SET pricing_version = 'legacy' WHERE pricing_version IS NULL;
UPDATE public.golf_leagues SET pricing_version = 'legacy' WHERE pricing_version IS NULL;

-- 5. Metadata for schema clarity
COMMENT ON COLUMN public.organizations.pricing_model IS 'Distinguishes between legacy pricing and the new 2024-Q4 pricing model (bash, 99, 99, 999).';
COMMENT ON COLUMN public.tournaments.pricing_version IS 'Used to grandfather existing events into old pricing rules (50 flat vs new 99 per-event).';
COMMENT ON COLUMN public.golf_leagues.pricing_version IS 'Used to grandfather existing leagues into old pricing rules (99 annual vs new 99 annual).';
