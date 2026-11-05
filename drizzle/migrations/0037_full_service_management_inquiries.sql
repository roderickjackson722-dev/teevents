CREATE TABLE public.full_service_inquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 answers jsonb NOT NULL,
 email_sent_at timestamptz,
 email_provider_id text
);
GRANT SELECT ON public.full_service_inquiries TO authenticated;
GRANT ALL ON public.full_service_inquiries TO service_role;
ALTER TABLE public.full_service_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins review full service inquiries" ON public.full_service_inquiries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.full_service_inquiries IS 'Private Full Service Management quote inquiries only; no event, billing or payment data.';