
-- 1. activity_logs INSERT tightening
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Org members can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 2. demo_tournaments: revoke anon and re-grant non-PII columns
REVOKE SELECT ON public.demo_tournaments FROM anon;
GRANT SELECT (
  id, admin_id, tournament_name, event_date, location, course_name,
  registration_fee_cents, scoring_format, status, public_token,
  conversion_token, converted_at, live_tournament_id, created_at, updated_at
) ON public.demo_tournaments TO anon;

-- 3. sample_tournaments: revoke anon and re-grant non-CRM columns
REVOKE SELECT ON public.sample_tournaments FROM anon;
GRANT SELECT (
  id, admin_id, unique_slug, tournament_name, event_date, location,
  description, logo_url, hero_image_url, scoring_format,
  registration_fee_cents, team_fee_cents, view_count, last_accessed_at,
  created_at, updated_at
) ON public.sample_tournaments TO anon;

-- 4. tournament_offline_donations: revoke anon and re-grant aggregate columns only
REVOKE SELECT ON public.tournament_offline_donations FROM anon;
GRANT SELECT (id, tournament_id, amount_cents, received_date, created_at)
ON public.tournament_offline_donations TO anon;
