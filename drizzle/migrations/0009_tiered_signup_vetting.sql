ALTER TABLE public.signup_vetting
  ADD COLUMN IF NOT EXISTS full_legal_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS organization_website text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS events_per_year text,
  ADD COLUMN IF NOT EXISTS event_description text,
  ADD COLUMN IF NOT EXISTS paid_registrations boolean,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS vetting_notes text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS signup_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS flag_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS doc_social_url text,
  ADD COLUMN IF NOT EXISTS doc_tax_id text,
  ADD COLUMN IF NOT EXISTS doc_file_path text,
  ADD COLUMN IF NOT EXISTS docs_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
CREATE INDEX IF NOT EXISTS signup_vetting_ip_idx ON public.signup_vetting(ip_address, created_at);
CREATE INDEX IF NOT EXISTS signup_vetting_status_idx ON public.signup_vetting(vetting_status);
CREATE UNIQUE INDEX IF NOT EXISTS signup_vetting_review_token_idx ON public.signup_vetting(review_token);