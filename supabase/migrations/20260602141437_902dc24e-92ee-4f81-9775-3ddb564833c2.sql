
-- =====================================================
-- PART A: course_database (shared registry)
-- =====================================================
CREATE TABLE public.course_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  tee_name TEXT,
  par_total INTEGER,
  course_rating NUMERIC(4,1),
  slope_rating INTEGER,
  hole_pars JSONB,
  hole_stroke_indexes JSONB,
  hole_distances JSONB,
  created_by UUID,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_database_name ON public.course_database (lower(course_name));
CREATE INDEX idx_course_database_state ON public.course_database (state);

GRANT SELECT, INSERT, UPDATE ON public.course_database TO authenticated;
GRANT ALL ON public.course_database TO service_role;

ALTER TABLE public.course_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed-in can read courses"
  ON public.course_database FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in users can add courses"
  ON public.course_database FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators or admins can update courses"
  ON public.course_database FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete courses"
  ON public.course_database FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_course_database_updated_at
  BEFORE UPDATE ON public.course_database
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART B: admin_invoices version history
-- =====================================================
ALTER TABLE public.admin_invoices
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS edit_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =====================================================
-- PART C: CRM
-- =====================================================
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'golfer',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  invited BOOLEAN NOT NULL DEFAULT FALSE,
  invited_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contacts_tournament ON public.crm_contacts (tournament_id);
CREATE INDEX idx_crm_contacts_org ON public.crm_contacts (organization_id);

CREATE TABLE public.crm_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL DEFAULT 'outgoing',
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_comms_contact ON public.crm_communications (contact_id);

CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  assigned_to UUID,
  task_type TEXT NOT NULL DEFAULT 'follow-up',
  title TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_crm_tasks_tournament ON public.crm_tasks (tournament_id);
CREATE INDEX idx_crm_tasks_contact ON public.crm_tasks (contact_id);

CREATE TABLE public.crm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  changed_by UUID,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_audit_contact ON public.crm_audit_log (contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT SELECT, INSERT ON public.crm_audit_log TO authenticated;
GRANT ALL ON public.crm_contacts, public.crm_communications, public.crm_tasks, public.crm_audit_log TO service_role;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_audit_log ENABLE ROW LEVEL SECURITY;

-- contacts: org members can read; members can insert/update; only owners can delete
CREATE POLICY "Org members read contacts" ON public.crm_contacts
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members create contacts" ON public.crm_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND auth.uid() = created_by);

CREATE POLICY "Org members update contacts" ON public.crm_contacts
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners delete contacts" ON public.crm_contacts
  FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id));

-- comms: read/insert if org member of the contact's org
CREATE POLICY "Org members read comms" ON public.crm_communications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Org members add comms" ON public.crm_communications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Org members update comms" ON public.crm_communications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Org members delete comms" ON public.crm_communications
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));

-- tasks: scope via tournament -> organization_id
CREATE POLICY "Org members read tasks" ON public.crm_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members add tasks" ON public.crm_tasks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members update tasks" ON public.crm_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE POLICY "Org members delete tasks" ON public.crm_tasks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

-- audit: read for org members; insert allowed (written by trigger); no update/delete
CREATE POLICY "Org members read audit" ON public.crm_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Org members insert audit" ON public.crm_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_contacts c WHERE c.id = contact_id AND public.is_org_member(auth.uid(), c.organization_id)));

-- updated_at trigger
CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- audit trigger: log per-field changes on UPDATE
CREATE OR REPLACE FUNCTION public.log_crm_contact_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  k text;
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_j) LOOP
    IF k IN ('updated_at') THEN CONTINUE; END IF;
    IF (new_j -> k) IS DISTINCT FROM (old_j -> k) THEN
      INSERT INTO public.crm_audit_log (contact_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, v_user, k, COALESCE(old_j->>k, ''), COALESCE(new_j->>k, ''));
    END IF;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_contacts_audit
  AFTER UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_contact_change();
