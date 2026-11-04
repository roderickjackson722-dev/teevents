CREATE TABLE public.admin_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Accepted','Declined','Expired')),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_proposals TO authenticated;
GRANT ALL ON public.admin_proposals TO service_role;
ALTER TABLE public.admin_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage draft proposals" ON public.admin_proposals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_proposals_created_at_idx ON public.admin_proposals (created_at DESC);
COMMENT ON TABLE public.admin_proposals IS 'Isolated admin proposal drafts. Status changes do not send email, charge clients, or create events.';