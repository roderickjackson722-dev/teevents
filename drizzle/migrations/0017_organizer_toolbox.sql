CREATE TABLE public.organizer_toolboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  logo jsonb,
  brand_colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  hero_image jsonb,
  sponsor_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_notes text,
  anything_else text,
  onboarding_seen_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizer_toolboxes TO authenticated;
GRANT ALL ON public.organizer_toolboxes TO service_role;
ALTER TABLE public.organizer_toolboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read toolbox" ON public.organizer_toolboxes FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members insert toolbox" ON public.organizer_toolboxes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND reviewed_at IS NULL AND reviewed_by IS NULL);
CREATE POLICY "Org members or admin update toolbox" ON public.organizer_toolboxes FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Organizers may not set review fields themselves
CREATE OR REPLACE FUNCTION public.protect_toolbox_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.role() <> 'service_role' THEN
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER organizer_toolboxes_protect_review BEFORE UPDATE ON public.organizer_toolboxes
  FOR EACH ROW EXECUTE FUNCTION public.protect_toolbox_review();

CREATE POLICY "Toolbox files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'organizer-toolbox' AND (public.has_role(auth.uid(), 'admin') OR public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name))));
CREATE POLICY "Toolbox files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'organizer-toolbox' AND public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name)));
CREATE POLICY "Toolbox files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'organizer-toolbox' AND public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name)));