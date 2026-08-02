-- 1) demo_players: hide email from public/anon reads via column-level privileges
REVOKE SELECT ON public.demo_players FROM anon;
REVOKE SELECT ON public.demo_players FROM authenticated;
GRANT SELECT (id, demo_tournament_id, name, handicap, shirt_size, group_name, tee_time, created_at) ON public.demo_players TO anon;
GRANT SELECT (id, demo_tournament_id, name, handicap, shirt_size, group_name, tee_time, created_at) ON public.demo_players TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.demo_players TO authenticated;
GRANT ALL ON public.demo_players TO service_role;

-- 2) storage: only org staff for the league (or admins) may overwrite league member photos
DROP POLICY IF EXISTS "Authenticated can update league member photos" ON storage.objects;
CREATE POLICY "League staff can update league member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sponsorship-assets'
  AND (storage.foldername(name))[1] = 'league-member-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.golf_leagues l
      WHERE l.id::text = (storage.foldername(name))[2]
        AND public.is_org_member(auth.uid(), l.organization_id)
    )
  )
)
WITH CHECK (
  bucket_id = 'sponsorship-assets'
  AND (storage.foldername(name))[1] = 'league-member-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.golf_leagues l
      WHERE l.id::text = (storage.foldername(name))[2]
        AND public.is_org_member(auth.uid(), l.organization_id)
    )
  )
);

-- 3) sample viewer must never gain membership in an organization that holds real data
CREATE OR REPLACE FUNCTION public.sample_viewer_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = 'sample-viewer@teevents.internal' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.org_is_demo_only(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _org_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.organization_id = _org_id
      AND COALESCE(t.is_sample, false) = false
      AND COALESCE(t.is_demo, false) = false
  );
$$;

-- Attach the shared viewer only to demo-only orgs. Returns false when refused.
CREATE OR REPLACE FUNCTION public.attach_sample_viewer(_org_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _org_id IS NULL OR _viewer_id IS NULL THEN
    RETURN false;
  END IF;
  IF _viewer_id IS DISTINCT FROM public.sample_viewer_user_id() THEN
    RETURN false;
  END IF;
  IF NOT public.org_is_demo_only(_org_id) THEN
    RETURN false;
  END IF;
  INSERT INTO public.org_members (organization_id, user_id, role, permissions)
  VALUES (_org_id, _viewer_id, 'viewer', '{}')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_sample_viewer(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_sample_viewer(uuid, uuid) TO service_role;

-- Automatically strip the shared viewer as soon as an org holds a real tournament
CREATE OR REPLACE FUNCTION public.purge_sample_viewer_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL
     AND COALESCE(NEW.is_sample, false) = false
     AND COALESCE(NEW.is_demo, false) = false THEN
    v_id := public.sample_viewer_user_id();
    IF v_id IS NOT NULL THEN
      DELETE FROM public.org_members
      WHERE organization_id = NEW.organization_id AND user_id = v_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_sample_viewer_membership ON public.tournaments;
CREATE TRIGGER trg_purge_sample_viewer_membership
AFTER INSERT OR UPDATE OF is_sample, is_demo, organization_id ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.purge_sample_viewer_membership();