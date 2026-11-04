ALTER TABLE public.proposal_web_documents
 ADD COLUMN IF NOT EXISTS recipient_email text,
 ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
 ADD COLUMN IF NOT EXISTS sent_at timestamptz,
 ADD COLUMN IF NOT EXISTS sent_to text,
 ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.proposal_web_documents ADD CONSTRAINT proposal_web_documents_status_check CHECK (status IN ('draft','sent','accepted','declined'));