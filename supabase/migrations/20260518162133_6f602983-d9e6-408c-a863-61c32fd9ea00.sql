
-- =========================================================
-- 1. Tournament-assets bucket: scoped write access
-- =========================================================

DROP POLICY IF EXISTS "Authenticated users can upload tournament assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tournament assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tournament assets" ON storage.objects;

-- Helper: safe uuid cast of first folder segment
CREATE OR REPLACE FUNCTION public._storage_first_folder_uuid(_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  f text;
BEGIN
  f := (storage.foldername(_name))[1];
  IF f IS NULL OR f !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN f::uuid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._storage_first_folder_uuid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._storage_first_folder_uuid(text) TO anon, authenticated, service_role;

-- Org-scoped INSERT (org members writing under their own org prefix)
CREATE POLICY "Org members can upload tournament assets in their org folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-assets'
  AND public._storage_first_folder_uuid(name) IS NOT NULL
  AND public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name))
);

CREATE POLICY "Org members can update tournament assets in their org folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tournament-assets'
  AND public._storage_first_folder_uuid(name) IS NOT NULL
  AND public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name))
);

CREATE POLICY "Org members can delete tournament assets in their org folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-assets'
  AND public._storage_first_folder_uuid(name) IS NOT NULL
  AND public.is_org_member(auth.uid(), public._storage_first_folder_uuid(name))
);

-- Admin override for legacy / cross-org admin work
CREATE POLICY "Admins can write tournament assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tournament-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update tournament assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tournament-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete tournament assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tournament-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Public sponsor-registration logo upload (anonymous form on tournament site)
-- Only allows writing under {orgId}/{tournamentId}/sponsor-logos/ for a real tournament.
CREATE POLICY "Public sponsor logo uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'tournament-assets'
  AND (storage.foldername(name))[3] = 'sponsor-logos'
  AND public._storage_first_folder_uuid(name) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id::text = (storage.foldername(name))[2]
      AND t.organization_id = public._storage_first_folder_uuid(name)
  )
);

-- =========================================================
-- 2. Revoke EXECUTE on internal SECURITY DEFINER functions
-- =========================================================

DO $$
DECLARE
  fn record;
  keep_list text[] := ARRAY[
    'has_role',
    'is_org_member',
    'mark_demo_lead_started',
    'update_demo_lead_feedback',
    'get_player_hub_by_token',
    'get_college_invitation_by_token',
    'update_college_invitation_rsvp_by_token',
    '_storage_first_folder_uuid'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> ALL (keep_list)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.proname, fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      fn.proname, fn.args
    );
  END LOOP;
END $$;
