ALTER TABLE public.admin_proposals ADD COLUMN sent_at timestamptz, ADD COLUMN accepted_at timestamptz, ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now();
CREATE OR REPLACE FUNCTION public.admin_proposals_track_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
  NEW.status_changed_at := now();
  IF NEW.status = 'Sent' AND NEW.sent_at IS NULL THEN NEW.sent_at := now(); END IF;
  IF NEW.status = 'Accepted' AND NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER admin_proposals_track_status BEFORE INSERT OR UPDATE ON public.admin_proposals FOR EACH ROW EXECUTE FUNCTION public.admin_proposals_track_status();
CREATE TABLE public.admin_proposal_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_proposal_templates TO authenticated;
GRANT ALL ON public.admin_proposal_templates TO service_role;
ALTER TABLE public.admin_proposal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage proposal templates" ON public.admin_proposal_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));