ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS custom_domain_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_renewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_renewal_session_id text,
  ADD COLUMN IF NOT EXISTS custom_domain_notice1_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_notice2_sent_at timestamptz;