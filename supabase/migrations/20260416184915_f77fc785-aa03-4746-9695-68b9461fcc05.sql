-- Part 1: Add missing columns to platform_transactions
ALTER TABLE public.platform_transactions
  ADD COLUMN IF NOT EXISTS golfer_name TEXT,
  ADD COLUMN IF NOT EXISTS golfer_email TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS registration_id UUID;

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_platform_transactions_org_created 
  ON public.platform_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_transactions_status 
  ON public.platform_transactions(status);

-- Part 2: Backfill stripe_fee_cents from metadata where available
UPDATE public.platform_transactions
SET stripe_fee_cents = COALESCE((metadata->>'stripe_fee_cents')::integer, 0)
WHERE stripe_fee_cents = 0 
  AND metadata IS NOT NULL 
  AND metadata->>'stripe_fee_cents' IS NOT NULL;

-- Part 3: Backfill payout_method from organizations table
UPDATE public.platform_transactions pt
SET payout_method = COALESCE(o.payout_method, 'check')
FROM public.organizations o
WHERE pt.organization_id = o.id
  AND pt.payout_method IS NULL;

-- Part 4: Backfill registration_id from metadata
UPDATE public.platform_transactions
SET registration_id = ((metadata->'registration_ids'->>0)::uuid)
WHERE registration_id IS NULL
  AND metadata IS NOT NULL
  AND metadata->'registration_ids' IS NOT NULL
  AND jsonb_typeof(metadata->'registration_ids') = 'array'
  AND jsonb_array_length(metadata->'registration_ids') > 0;

-- Part 5: Backfill golfer_name and golfer_email from tournament_registrations
UPDATE public.platform_transactions pt
SET 
  golfer_name = TRIM(CONCAT(tr.first_name, ' ', tr.last_name)),
  golfer_email = tr.email
FROM public.tournament_registrations tr
WHERE pt.registration_id = tr.id
  AND (pt.golfer_name IS NULL OR pt.golfer_email IS NULL);

-- Part 6: Add an admin_notifications type for failed transactions (no schema change needed - just documenting)
-- The 'type' column already accepts any text value