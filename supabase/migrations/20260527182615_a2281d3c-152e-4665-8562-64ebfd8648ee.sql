
ALTER TABLE public.organization_payout_methods
  ADD COLUMN IF NOT EXISTS pending_bank_last4 text,
  ADD COLUMN IF NOT EXISTS pending_bank_brand text,
  ADD COLUMN IF NOT EXISTS bank_change_token text,
  ADD COLUMN IF NOT EXISTS bank_change_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_change_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_change_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_change_status text NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_opm_bank_change_token
  ON public.organization_payout_methods (bank_change_token)
  WHERE bank_change_token IS NOT NULL;
