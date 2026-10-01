ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS enterprise_subscription_id text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_name text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_email text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_phone text,
  ADD COLUMN IF NOT EXISTS dedicated_rep_avatar_url text;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pricing_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS event_fee_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS base_fee_cents integer,
  ADD COLUMN IF NOT EXISTS assigned_rep_id uuid,
  ADD COLUMN IF NOT EXISTS white_glove_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS white_glove_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS pricing_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS league_fee_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS annual_fee_cents integer,
  ADD COLUMN IF NOT EXISTS assigned_rep_id uuid,
  ADD COLUMN IF NOT EXISTS white_glove_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS white_glove_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_pricing_model_valid CHECK (pricing_model IN ('legacy', 'free', 'per_event', 'per_league', 'enterprise')) NOT VALID;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_pricing_version_valid CHECK (pricing_version IN ('legacy', '2026-10')) NOT VALID,
  ADD CONSTRAINT tournaments_pricing_model_valid CHECK (pricing_model IN ('free', 'per_event', 'enterprise')) NOT VALID;
ALTER TABLE public.golf_leagues
  ADD CONSTRAINT golf_leagues_pricing_version_valid CHECK (pricing_version IN ('legacy', '2026-10')) NOT VALID,
  ADD CONSTRAINT golf_leagues_pricing_model_valid CHECK (pricing_model IN ('free', 'per_league', 'enterprise')) NOT VALID;

COMMENT ON COLUMN public.organizations.pricing_model IS 'Pricing cohort. Existing rows remain legacy; new customer workspaces are explicitly stamped by creation flows.';
COMMENT ON COLUMN public.tournaments.pricing_version IS 'Grandfathering boundary. legacy preserves prior behavior; 2026-10 uses the current pricing structure.';
COMMENT ON COLUMN public.golf_leagues.pricing_version IS 'Grandfathering boundary. legacy preserves prior behavior; 2026-10 uses the current pricing structure.';