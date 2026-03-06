
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_name text NOT NULL,
  organizer_name text DEFAULT '',
  contact_name text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  location text DEFAULT '',
  event_date text DEFAULT '',
  source text DEFAULT 'eventbrite',
  source_url text DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  notes text DEFAULT '',
  last_contacted_at timestamp with time zone,
  next_follow_up date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prospects"
  ON public.prospects FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert prospects"
  ON public.prospects FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update prospects"
  ON public.prospects FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can delete prospects"
  ON public.prospects FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
